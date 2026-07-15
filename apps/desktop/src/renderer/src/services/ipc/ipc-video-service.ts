import type { RecentVideoFile, VideoMetadata, VideoService } from '@dubforge/types';
import { unwrapNullableVideoImportResult, unwrapVideoImportResult } from './video-import-result';

export const ipcVideoService: VideoService = {
  async selectFile(): Promise<VideoMetadata | null> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Video bridge is unavailable.');
    }

    const result = await api.video.selectFile();
    return unwrapNullableVideoImportResult(result);
  },

  async inspectFile(filePath: string): Promise<VideoMetadata> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Video bridge is unavailable.');
    }

    const result = await api.video.inspectFile(filePath);
    return unwrapVideoImportResult(result);
  },

  listRecentFiles(): Promise<readonly RecentVideoFile[]> {
    const api = window.dubforge;
    if (api === undefined) {
      return Promise.resolve([]);
    }

    return api.video.listRecentFiles();
  },

  async openRecentFile(id: string): Promise<VideoMetadata> {
    const api = window.dubforge;
    if (api === undefined) {
      throw new Error('Video bridge is unavailable.');
    }

    const result = await api.video.openRecentFile(id);
    return unwrapVideoImportResult(result);
  },
};
