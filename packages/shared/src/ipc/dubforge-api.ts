import type { StartJobRequest } from '@dubforge/types';
import type { PipelineEventPayload, PipelineJobResponse } from './pipeline-schemas';
import type { VideoImportResult } from './video-schemas';

export interface DubForgeVideoApi {
  selectFile(): Promise<VideoImportResult | null>;
  inspectFile(filePath: string): Promise<VideoImportResult>;
  listRecentFiles(): Promise<readonly import('@dubforge/types').RecentVideoFile[]>;
  openRecentFile(id: string): Promise<VideoImportResult>;
}

export interface DubForgeFilesApi {
  getPathForFile(file: File): string;
}

export interface DubForgePipelineApi {
  startJob(request: StartJobRequest): Promise<PipelineJobResponse>;
  cancelJob(jobId: string): Promise<void>;
  getActiveJob(): Promise<PipelineJobResponse | null>;
  subscribeEvents(listener: (event: PipelineEventPayload) => void): () => void;
}

export interface DubForgeApi {
  readonly platform: NodeJS.Platform;
  readonly video: DubForgeVideoApi;
  readonly files: DubForgeFilesApi;
  readonly pipeline: DubForgePipelineApi;
}
