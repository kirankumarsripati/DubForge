import { createServiceContainer, createToken } from '@dubforge/shared';
import type { ServiceContainer } from '@dubforge/shared';
import { app } from 'electron';
import { join } from 'node:path';
import { FfprobeService } from './services/ffprobe-service';
import { PipelineJobService } from './services/pipeline-job-service';
import { getRecentFilesStorePath, RecentFilesService } from './services/recent-files-service';
import { ThumbnailService } from './services/thumbnail-service';
import { VideoCacheService } from './services/video-cache-service';
import { VideoImportService } from './services/video-import-service';

export const FFPROBE_SERVICE_TOKEN = createToken<FfprobeService>('FfprobeService');
export const VIDEO_CACHE_SERVICE_TOKEN = createToken<VideoCacheService>('VideoCacheService');
export const THUMBNAIL_SERVICE_TOKEN = createToken<ThumbnailService>('ThumbnailService');
export const RECENT_FILES_SERVICE_TOKEN = createToken<RecentFilesService>('RecentFilesService');
export const VIDEO_IMPORT_SERVICE_TOKEN = createToken<VideoImportService>('VideoImportService');
export const PIPELINE_JOB_SERVICE_TOKEN = createToken<PipelineJobService>('PipelineJobService');

export function createThumbnailUrl(videoId: string): string {
  return `dubforge://thumbnail/${videoId}`;
}

export function createApplicationContainer(): ServiceContainer {
  const container = createServiceContainer();
  const userDataPath = app.getPath('userData');
  const cacheRoot = join(userDataPath, 'cache');

  container.registerSingleton(FFPROBE_SERVICE_TOKEN, () => new FfprobeService('ffprobe'));
  container.registerSingleton(VIDEO_CACHE_SERVICE_TOKEN, () => new VideoCacheService(cacheRoot));
  container.registerSingleton(THUMBNAIL_SERVICE_TOKEN, () => new ThumbnailService());
  container.registerSingleton(
    RECENT_FILES_SERVICE_TOKEN,
    () => new RecentFilesService(getRecentFilesStorePath(userDataPath)),
  );
  container.registerSingleton(VIDEO_IMPORT_SERVICE_TOKEN, () => {
    return new VideoImportService(
      container.resolve(FFPROBE_SERVICE_TOKEN),
      container.resolve(VIDEO_CACHE_SERVICE_TOKEN),
      container.resolve(THUMBNAIL_SERVICE_TOKEN),
      container.resolve(RECENT_FILES_SERVICE_TOKEN),
      createThumbnailUrl,
    );
  });
  container.registerSingleton(PIPELINE_JOB_SERVICE_TOKEN, () => {
    return new PipelineJobService(
      container.resolve(VIDEO_CACHE_SERVICE_TOKEN),
      join(userDataPath, 'jobs'),
    );
  });

  return container;
}
