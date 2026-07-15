import { access, realpath } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import {
  createValidationFailure,
  SUPPORTED_VIDEO_EXTENSIONS,
  toVideoMetadata,
  validateVideoFileStats,
  validateVideoProbe,
  type VideoValidationFailure,
} from '@dubforge/shared';
import type { RecentVideoFile, VideoMetadata } from '@dubforge/types';
import type { FfprobeService } from './ffprobe-service';
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
    private readonly ffprobeService: FfprobeService,
    private readonly cacheService: VideoCacheService,
    private readonly thumbnailService: ThumbnailService,
    private readonly recentFilesService: RecentFilesService,
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
      const hasThumbnail = await this.cacheService.hasThumbnail(videoId);
      if (!hasThumbnail) {
        const { thumbnailPath } = this.cacheService.getPaths(videoId);
        try {
          await this.thumbnailService.generateAtTimestamp(
            normalizedPath,
            cached.thumbnailTimestampSeconds,
            thumbnailPath,
          );
        } catch {
          throw new VideoImportError(createValidationFailure('unreadable'));
        }
      }

      const thumbnailUrl = (await this.cacheService.hasThumbnail(videoId))
        ? this.createThumbnailUrl(videoId)
        : null;

      await this.trackRecentFile(cached);
      return toVideoMetadata(cached, thumbnailUrl);
    }

    let probe;
    try {
      probe = await this.ffprobeService.probe(normalizedPath);
    } catch {
      throw new VideoImportError(createValidationFailure('unreadable'));
    }

    const probeFailure = validateVideoProbe(probe);
    if (probeFailure !== null) {
      throw new VideoImportError(probeFailure);
    }

    const record = this.cacheService.buildRecord({
      id: videoId,
      filePath: normalizedPath,
      filename,
      fileSizeBytes,
      fileModifiedAtMs,
      probe,
    });

    await this.cacheService.writeCachedRecord(record);

    const { thumbnailPath } = this.cacheService.getPaths(videoId);
    try {
      await this.thumbnailService.generateAtTimestamp(
        normalizedPath,
        record.thumbnailTimestampSeconds,
        thumbnailPath,
      );
    } catch {
      throw new VideoImportError(createValidationFailure('unreadable'));
    }

    await this.trackRecentFile(record);

    return toVideoMetadata(record, this.createThumbnailUrl(videoId));
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
