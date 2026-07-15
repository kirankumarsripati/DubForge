import { createServiceContainer, createToken } from '@dubforge/shared';
import type { ServiceContainer } from '@dubforge/shared';
import { app } from 'electron';
import { join } from 'node:path';

import {
  createDesktopMediaStack,
  resolveFfprobePath,
  type DesktopMediaStack,
} from './services/desktop-media-stack';
import { createPipelineJobService, type PipelineJobService } from './services/pipeline-job-service';
import { getRecentFilesStorePath, RecentFilesService } from './services/recent-files-service';
import { ThumbnailService } from './services/thumbnail-service';
import { VideoCacheService } from './services/video-cache-service';
import { VideoImportService } from './services/video-import-service';

export const DESKTOP_MEDIA_STACK_TOKEN = createToken<DesktopMediaStack>('DesktopMediaStack');
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

  container.registerSingleton(DESKTOP_MEDIA_STACK_TOKEN, () =>
    createDesktopMediaStack({
      userDataPath,
      ffprobePath: resolveFfprobePath(),
    }),
  );
  container.registerSingleton(VIDEO_CACHE_SERVICE_TOKEN, () => new VideoCacheService(cacheRoot));
  container.registerSingleton(THUMBNAIL_SERVICE_TOKEN, () => new ThumbnailService());
  container.registerSingleton(
    RECENT_FILES_SERVICE_TOKEN,
    () => new RecentFilesService(getRecentFilesStorePath(userDataPath)),
  );
  container.registerSingleton(VIDEO_IMPORT_SERVICE_TOKEN, () => {
    const mediaStack = container.resolve(DESKTOP_MEDIA_STACK_TOKEN);
    return new VideoImportService(
      mediaStack.mediaPlatform.importService,
      mediaStack.mediaPlatform.ffprobeDiagnostics,
      container.resolve(VIDEO_CACHE_SERVICE_TOKEN),
      container.resolve(THUMBNAIL_SERVICE_TOKEN),
      container.resolve(RECENT_FILES_SERVICE_TOKEN),
      mediaStack.artifactRoot,
      createThumbnailUrl,
    );
  });

  return container;
}

export function initializeApplicationContainer(): ServiceContainer {
  const container = createApplicationContainer();
  const pipelineService = createPipelineJobService(
    container.resolve(VIDEO_CACHE_SERVICE_TOKEN),
    join(app.getPath('userData'), 'jobs'),
  );
  container.registerSingleton(PIPELINE_JOB_SERVICE_TOKEN, () => pipelineService);
  return container;
}

export function disposeApplicationContainer(container: ServiceContainer): void {
  container.resolve(DESKTOP_MEDIA_STACK_TOKEN).close();
}
