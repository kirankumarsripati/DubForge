import type { RecentVideoFile } from '@dubforge/types';
import type { VideoImportResult } from './video-schemas';

export interface DubForgeVideoApi {
  selectFile(): Promise<VideoImportResult | null>;
  inspectFile(filePath: string): Promise<VideoImportResult>;
  listRecentFiles(): Promise<readonly RecentVideoFile[]>;
  openRecentFile(id: string): Promise<VideoImportResult>;
}

export interface DubForgeFilesApi {
  getPathForFile(file: File): string;
}

export interface DubForgeApi {
  readonly platform: NodeJS.Platform;
  readonly video: DubForgeVideoApi;
  readonly files: DubForgeFilesApi;
}
