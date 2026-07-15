import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDomainEventBus } from '@dubforge/platform-events';
import { validateVideoProbe } from '@dubforge/shared';

import { createMediaPlatform } from '../../media-platform.js';
import { ensureSampleMp4, isFfmpegAvailable } from '../test-fixtures.js';

const tempDirs: string[] = [];
let ffmpegAvailable = false;

beforeAll(async () => {
  ffmpegAvailable = await isFfmpegAvailable();
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('Media import integration', () => {
  it.skipIf(() => !ffmpegAvailable)(
    'probes a sample MP4 through the execution platform and stores metadata in SQLite',
    async () => {
      const rootPath = await mkdtemp(join(tmpdir(), 'dubforge-media-import-'));
      tempDirs.push(rootPath);
      const artifactRoot = join(rootPath, 'artifacts');
      const samplePath = join(rootPath, 'sample.mp4');
      await ensureSampleMp4(samplePath);

      const fileBuffer = await readFile(samplePath);
      const contentHash = createHash('sha256').update(fileBuffer).digest('hex');
      const eventBus = createDomainEventBus();

      const platform = createMediaPlatform({
        rootPath,
        eventBus,
        ffprobePath: 'ffprobe',
        useFixtureAdapters: false,
      });

      const stats = await stat(samplePath);

      const result = await platform.importService.probeImportedFile({
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

      const stored = platform.repository.findMediaFileByContentHash(contentHash);
      expect(stored).not.toBeNull();
      expect(stored?.filename).toBe('sample.mp4');

      const diagnostics = platform.ffprobeDiagnostics.getLatest();
      expect(diagnostics?.success).toBe(true);
      expect(diagnostics?.diagnostics.exitCode).toBe(0);

      platform.close();
    },
    60_000,
  );
});
