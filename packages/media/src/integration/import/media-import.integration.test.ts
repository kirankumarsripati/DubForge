import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDomainEventBus } from '@dubforge/platform-events';
import { validateVideoProbe } from '@dubforge/shared';

import type { ImportMediaResult } from '../../application/import-media-service.js';

import { MEDIA_ARTIFACT_FILENAMES } from '../../domain/artifact-names.js';
import { createMediaPlatform } from '../../media-platform.js';
import {
  createTempVideo,
  ensure4kVideo,
  ensureAudioOnlyMp4,
  ensureCorruptedVideo,
  ensurePortraitVideo,
  ensureSampleMkv,
  ensureSampleMov,
  ensureSampleMp4,
  isFfmpegAvailable,
  isWebpEncoderAvailable,
} from '../test-fixtures.js';

const tempDirs: string[] = [];
let ffmpegAvailable = false;
let webpEncoderAvailable = false;

beforeAll(async () => {
  ffmpegAvailable = await isFfmpegAvailable();
  webpEncoderAvailable = await isWebpEncoderAvailable();
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function importFixture(input: {
  readonly rootPath: string;
  readonly filePath: string;
  readonly filename: string;
}): Promise<ImportMediaResult> {
  const artifactRoot = join(input.rootPath, 'artifacts');
  const fileBuffer = await readFile(input.filePath);
  const contentHash = createHash('sha256').update(fileBuffer).digest('hex');
  const eventBus = createDomainEventBus();
  const artifactSink = {
    writeText: async (path: string, content: string): Promise<void> => {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
    },
  };

  const platform = createMediaPlatform({
    rootPath: input.rootPath,
    eventBus,
    ffprobePath: 'ffprobe',
    ffmpegPath: 'ffmpeg',
    useFixtureAdapters: false,
    artifactSink,
  });

  const stats = await stat(input.filePath);
  const result = await platform.importService.importVideoFile({
    filePath: input.filePath,
    filename: input.filename,
    contentHash,
    fileSizeBytes: stats.size,
    fileModifiedAtMs: stats.mtimeMs,
    artifactRoot,
  });

  platform.close();
  return result;
}

describe('Media import integration', () => {
  it('runs validate, fingerprint, metadata, thumbnail, and audio extraction end-to-end', async (context) => {
    if (!ffmpegAvailable) {
      context.skip();
      return;
    }

    if (!webpEncoderAvailable) {
      context.skip();
      return;
    }

    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-import-'));
    tempDirs.push(rootPath);
    const samplePath = join(rootPath, 'sample.mp4');
    await ensureSampleMp4(samplePath);

    const result = await importFixture({
      rootPath,
      filePath: samplePath,
      filename: 'sample.mp4',
    });

    expect(validateVideoProbe(result.probe)).toBeNull();
    expect(result.probe.videoStream.width).toBeGreaterThan(0);
    expect(result.probe.audioTrackCount).toBeGreaterThan(0);

    await access(result.artifacts.fingerprint);
    await access(result.artifacts.metadata);
    await access(result.artifacts.thumbnail);
    await access(result.artifacts.audio);

    const thumbnailHeader = await readFile(result.artifacts.thumbnail);
    expect(thumbnailHeader.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(thumbnailHeader.subarray(8, 12).toString('ascii')).toBe('WEBP');

    const audioHeader = await readFile(result.artifacts.audio);
    expect(audioHeader.subarray(0, 4).toString('ascii')).toBe('RIFF');
  }, 120_000);

  it.each([
    ['MP4', '.mp4', ensureSampleMp4],
    ['MOV', '.mov', ensureSampleMov],
    ['MKV', '.mkv', ensureSampleMkv],
    ['portrait', '.mp4', ensurePortraitVideo],
    ['4K', '.mp4', ensure4kVideo],
  ] as const)(
    'imports %s videos and registers required artifacts',
    async (_label, extension, generator) => {
      if (!ffmpegAvailable || !webpEncoderAvailable) {
        return;
      }

      const rootPath = await mkdtemp(join(tmpdir(), `dubforge-media-${_label}-`));
      tempDirs.push(rootPath);
      const fixture = await createTempVideo(`dubforge-${_label}-`, extension, generator);

      const result = await importFixture({
        rootPath,
        filePath: fixture.filePath,
        filename: `sample${extension}`,
      });

      expect(result.artifacts.fingerprint.endsWith(MEDIA_ARTIFACT_FILENAMES.FINGERPRINT)).toBe(
        true,
      );
      expect(result.artifacts.metadata.endsWith(MEDIA_ARTIFACT_FILENAMES.METADATA)).toBe(true);
      expect(result.artifacts.thumbnail.endsWith(MEDIA_ARTIFACT_FILENAMES.THUMBNAIL)).toBe(true);
      expect(result.artifacts.audio.endsWith(MEDIA_ARTIFACT_FILENAMES.AUDIO)).toBe(true);
    },
    180_000,
  );

  it('documents ffmpeg with libwebp requirement for thumbnail coverage', () => {
    expect(ffmpegAvailable).toBe(true);
  });

  it('fails with detailed diagnostics for corrupted video', async (context) => {
    if (!ffmpegAvailable) {
      context.skip();
      return;
    }

    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-corrupt-'));
    tempDirs.push(rootPath);
    const corruptPath = join(rootPath, 'corrupt.mp4');
    await ensureCorruptedVideo(corruptPath);

    await expect(
      importFixture({
        rootPath,
        filePath: corruptPath,
        filename: 'corrupt.mp4',
      }),
    ).rejects.toThrow();
  }, 60_000);

  it('fails audio-only input during metadata validation', async (context) => {
    if (!ffmpegAvailable) {
      context.skip();
      return;
    }

    const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-audio-only-'));
    tempDirs.push(rootPath);
    const audioPath = join(rootPath, 'audio-only.mp4');
    await ensureAudioOnlyMp4(audioPath);

    await expect(
      importFixture({
        rootPath,
        filePath: audioPath,
        filename: 'audio-only.mp4',
      }),
    ).rejects.toThrow();
  }, 60_000);
});
