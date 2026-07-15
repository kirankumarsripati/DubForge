import type { StartJobRequest } from '@dubforge/types';
import type { ModelResponse, ModelsChangedEvent } from './model-schemas';
import type { PipelineEventPayload, PipelineJobResponse } from './pipeline-schemas';
import type { VideoImportResult } from './video-schemas';

export interface DubForgeVideoApi {
  selectFile(): Promise<VideoImportResult | null>;
  inspectFile(filePath: string): Promise<VideoImportResult>;
  listRecentFiles(): Promise<readonly import('@dubforge/types').RecentVideoFile[]>;
  openRecentFile(id: string): Promise<VideoImportResult>;
  getFfprobeDiagnostics(): Promise<
    readonly import('./video-schemas').FfprobeDiagnosticRecordResponse[]
  >;
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

export interface DubForgeModelsApi {
  listModels(): Promise<readonly ModelResponse[]>;
  downloadModel(id: string): Promise<ModelResponse>;
  deleteModel(id: string): Promise<void>;
  updateModel(id: string): Promise<ModelResponse>;
  verifyModel(id: string): Promise<ModelResponse>;
  repairModel(id: string): Promise<ModelResponse>;
  subscribeEvents(listener: (event: ModelsChangedEvent) => void): () => void;
}

export interface DubForgeApi {
  readonly platform: NodeJS.Platform;
  readonly video: DubForgeVideoApi;
  readonly files: DubForgeFilesApi;
  readonly pipeline: DubForgePipelineApi;
  readonly models: DubForgeModelsApi;
}
