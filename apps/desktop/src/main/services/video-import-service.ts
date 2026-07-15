import { access, copyFile, realpath } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import type { ImportMediaService } from '@dubforge/media';
import type { FfprobeDiagnosticsCollector } from '@dubforge/media';
import {
  createValidationFailure,
  FfprobeParseError,
  VideoValidationException,
  SUPPORTED_VIDEO_EXTENSIONS,
  toVideoMetadata,
  validateVideoFileStats,
  validateVideoProbe,
  type VideoValidationFailure,
} from '@dubforge/shared';
import type { RecentVideoFile, VideoMetadata } from '@dubforge/types';

import type { RecentFilesService } from './recent-files-service';
import type { ThumbnailService } from './thumbnail-service';
import type { VideoCacheService } from './video-cache-service';

export class VideoImportError extends Error {
  constructor(readonly failure: VideoValidationFailure) {
    super(failure.description);
    this.name = 'VideoImportError';
  }
}

function hasSupportedExtension(extension: string): boolean {
  return SUPPORTED_VIDEO_EXTENSIONS.some((supported) => supported === extension);
}

export class VideoImportService {
  constructor(
    private readonly importMediaService: ImportMediaService,
    private readonly ffprobeDiagnostics: FfprobeDiagnosticsCollector,
    private readonly cacheService: VideoCacheService,
    private readonly thumbnailService: ThumbnailService,
    private readonly recentFilesService: RecentFilesService,
    private readonly artifactRoot: string,
    private readonly createThumbnailUrl: (videoId: string) => string,
  ) {}

  async importFile(filePath: string): Promise<VideoMetadata> {
    const normalizedPath = await this.resolveVideoPath(filePath);
    const filename = basename(normalizedPath);
    const { fileSizeBytes, fileModifiedAtMs } =
      await this.cacheService.getFileStats(normalizedPath);

    const statsFailure = validateVideoFileStats({
      filePath: normalizedPath,
      filename,
      fileSizeBytes,
      fileModifiedAtMs,
    });
    if (statsFailure !== null) {
      throw new VideoImportError(statsFailure);
    }

    const videoId = await this.cacheService.computeVideoId(normalizedPath);
    const cached = await this.cacheService.readCachedRecord(videoId);
    if (
      cached !== null &&
      this.cacheService.isCacheValid(cached, fileSizeBytes, fileModifiedAtMs)
    ) {
      return this.finalizeImport({
        normalizedPath,
        videoId,
        record: cached,
        allowMissingThumbnail: true,
      });
    }

    let importResult;
    try {
      importResult = await this.importMediaService.importVideoFile({
        filePath: normalizedPath,
        filename,
        contentHash: videoId,
        fileSizeBytes,
        fileModifiedAtMs,
        artifactRoot: this.artifactRoot,
      });
    } catch (error) {
      if (error instanceof VideoValidationException) {
        throw new VideoImportError(error.failure);
      }

      if (error instanceof FfprobeParseError) {
        throw new VideoImportError({
          code: 'unreadable',
          title: 'Unable to read video',
          description: error.message,
          recoveryAction: 'Verify the file plays correctly in another app, then try again.',
        });
      }

      throw error;
    }

    const probeFailure = validateVideoProbe(importResult.probe);
    if (probeFailure !== null) {
      throw new VideoImportError(probeFailure);
    }

    const record = this.cacheService.buildRecord({
      id: videoId,
      filePath: normalizedPath,
      filename,
      fileSizeBytes,
      fileModifiedAtMs,
      probe: importResult.probe,
    });

    await this.cacheService.writeCachedRecord(record);

    const { thumbnailPath } = this.cacheService.getPaths(videoId);
    await copyFile(importResult.artifacts.thumbnail, thumbnailPath);

    return this.finalizeImport({
      normalizedPath,
      videoId,
      record,
      allowMissingThumbnail: true,
    });
  }

  getFfprobeDiagnostics(): ReturnType<FfprobeDiagnosticsCollector['getRecords']> {
    return this.ffprobeDiagnostics.getRecords();
  }

  async listRecentFiles(): Promise<readonly RecentVideoFile[]> {
    const files = await this.recentFilesService.list();
    const results: RecentVideoFile[] = [];

    for (const file of files) {
      const hasThumbnail = await this.cacheService.hasThumbnail(file.id);
      results.push({
        id: file.id,
        filename: file.filename,
        importedAt: file.importedAt,
        durationSeconds: file.durationSeconds,
        thumbnailUrl: hasThumbnail ? this.createThumbnailUrl(file.id) : null,
      });
    }

    return results;
  }

  async openRecentFile(id: string): Promise<VideoMetadata> {
    const recent = await this.recentFilesService.findById(id);
    if (recent === null) {
      throw new VideoImportError(createValidationFailure('file-not-found'));
    }

    return this.importFile(recent.filePath);
  }

  private async finalizeImport(input: {
    readonly normalizedPath: string;
    readonly videoId: string;
    readonly record: Parameters<typeof toVideoMetadata>[0];
    readonly allowMissingThumbnail: boolean;
  }): Promise<VideoMetadata> {
    const { thumbnailPath } = this.cacheService.getPaths(input.videoId);
    const hasThumbnail = await this.cacheService.hasThumbnail(input.videoId);

    if (!hasThumbnail) {
      try {
        await this.thumbnailService.generateAtTimestamp(
          input.normalizedPath,
          input.record.thumbnailTimestampSeconds,
          thumbnailPath,
        );
      } catch (error) {
        if (!input.allowMissingThumbnail) {
          const message = error instanceof Error ? error.message : 'Thumbnail generation failed.';
          throw new VideoImportError({
            ...createValidationFailure('thumbnail-failed'),
            description: message,
          });
        }
      }
    }

    const thumbnailUrl = (await this.cacheService.hasThumbnail(input.videoId))
      ? this.createThumbnailUrl(input.videoId)
      : null;

    await this.trackRecentFile(input.record);

    return toVideoMetadata(input.record, thumbnailUrl);
  }

  private async resolveVideoPath(filePath: string): Promise<string> {
    const resolvedPath = resolve(filePath);
    const extension = extname(resolvedPath).toLowerCase();

    if (!hasSupportedExtension(extension)) {
      throw new VideoImportError(createValidationFailure('unsupported-extension'));
    }

    try {
      await access(resolvedPath);
      return await realpath(resolvedPath);
    } catch {
      throw new VideoImportError(createValidationFailure('file-not-found'));
    }
  }

  private async trackRecentFile(record: {
    readonly id: string;
    readonly filePath: string;
    readonly filename: string;
    readonly durationSeconds: number;
  }): Promise<void> {
    await this.recentFilesService.add({
      id: record.id,
      filePath: record.filePath,
      filename: record.filename,
      importedAt: new Date().toISOString(),
      durationSeconds: record.durationSeconds,
    });
  }
}
