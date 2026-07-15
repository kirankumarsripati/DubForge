import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDomainEventBus, MEDIA_EVENTS } from '@dubforge/platform-events';
import { validateVideoProbe } from '@dubforge/shared';

import { MEDIA_OPERATION_KINDS } from '../../domain/constants.js';
import { createMediaPlatform } from '../../media-platform.js';
import { ensureSampleMp4, isFfmpegAvailable } from '../test-fixtures.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('Media import integration', () => {
  it('runs fingerprint, metadata, thumbnail, and audio extraction end-to-end', async () => {
    expect(
      await isFfmpegAvailable(),
      'ffmpeg and ffprobe must be installed for media import integration tests',
    ).toBe(true);

    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-import-'));
    tempDirs.push(rootPath);
    const artifactRoot = join(rootPath, 'artifacts');
    const samplePath = join(rootPath, 'sample.mp4');
    await ensureSampleMp4(samplePath);

    const fileBuffer = await readFile(samplePath);
    const contentHash = createHash('sha256').update(fileBuffer).digest('hex');
    const eventBus = createDomainEventBus();
    const mediaEvents: string[] = [];
    const artifactSink = {
      writeText: async (path: string, content: string): Promise<void> => {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content, 'utf8');
      },
    };

    eventBus.subscribe((event) => {
      if (event.type.startsWith('media.')) {
        mediaEvents.push(event.type);
      }
    });

    const platform = createMediaPlatform({
      rootPath,
      eventBus,
      ffprobePath: 'ffprobe',
      ffmpegPath: 'ffmpeg',
      useFixtureAdapters: false,
      artifactSink,
    });

    const stats = await stat(samplePath);

    const result = await platform.importService.importVideoFile({
      filePath: samplePath,
      filename: 'sample.mp4',
      contentHash,
      fileSizeBytes: stats.size,
      fileModifiedAtMs: stats.mtimeMs,
      artifactRoot,
    });

    expect(validateVideoProbe(result.probe)).toBeNull();
    expect(result.probe.videoStream.width).toBeGreaterThan(0);
    expect(result.probe.audioTrackCount).toBeGreaterThan(0);
    expect(result.contentHash).toBe(contentHash);

    await access(result.artifacts.fingerprint);
    await access(result.artifacts.metadata);
    await access(result.artifacts.thumbnail);
    await access(result.artifacts.audio);

    const audioHeader = await readFile(result.artifacts.audio);
    expect(audioHeader.subarray(0, 4).toString('ascii')).toBe('RIFF');

    const stored = platform.repository.findMediaFileByContentHash(contentHash);
    expect(stored).not.toBeNull();
    expect(stored?.filename).toBe('sample.mp4');

    const operations = platform.repository.listOperationsByWorkflow(`import:${contentHash}`);
    expect(operations.map((operation) => operation.kind)).toEqual([
      MEDIA_OPERATION_KINDS.FINGERPRINT,
      MEDIA_OPERATION_KINDS.PROBE,
      MEDIA_OPERATION_KINDS.THUMBNAIL,
      MEDIA_OPERATION_KINDS.EXTRACT_AUDIO,
    ]);
    expect(operations.every((operation) => operation.status === 'completed')).toBe(true);

    expect(mediaEvents).toContain(MEDIA_EVENTS.FINGERPRINT_COMPUTED);
    expect(mediaEvents).toContain(MEDIA_EVENTS.FILE_PROBED);
    expect(mediaEvents).toContain(MEDIA_EVENTS.THUMBNAIL_GENERATED);
    expect(mediaEvents).toContain(MEDIA_EVENTS.AUDIO_EXTRACTED);
    expect(mediaEvents).toContain(MEDIA_EVENTS.IMPORT_COMPLETED);

    const diagnostics = platform.ffprobeDiagnostics.getLatest();
    expect(diagnostics?.success).toBe(true);
    expect(diagnostics?.diagnostics.exitCode).toBe(0);

    platform.close();
  }, 120_000);
});
