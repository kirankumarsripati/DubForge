import type { RecentVideoFile, VideoMetadata, VideoService } from '@dubforge/types';
import { MOCK_SAMPLE_VIDEO } from '../mock/mock-data';

export const mockVideoService: VideoService = {
  selectFile(): Promise<VideoMetadata | null> {
    return Promise.resolve(MOCK_SAMPLE_VIDEO);
  },

  inspectFile(): Promise<VideoMetadata> {
    return Promise.resolve(MOCK_SAMPLE_VIDEO);
  },

  listRecentFiles(): Promise<readonly RecentVideoFile[]> {
    return Promise.resolve([
      {
        id: MOCK_SAMPLE_VIDEO.id,
        filename: MOCK_SAMPLE_VIDEO.filename,
        importedAt: '2026-07-14T08:00:00Z',
        durationSeconds: MOCK_SAMPLE_VIDEO.durationSeconds,
        thumbnailUrl: MOCK_SAMPLE_VIDEO.thumbnailUrl,
      },
    ]);
  },

  openRecentFile(): Promise<VideoMetadata> {
    return Promise.resolve(MOCK_SAMPLE_VIDEO);
  },

  getFfprobeDiagnostics() {
    return Promise.resolve([]);
  },
};
