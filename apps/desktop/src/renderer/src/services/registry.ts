import type {
  AppService,
  JobService,
  ModelService,
  PipelineService,
  SettingsService,
  VideoService,
} from '@dubforge/types';
import { ipcModelService } from './ipc/ipc-model-service';
import { ipcPipelineService } from './ipc/ipc-pipeline-service';
import { ipcVideoService } from './ipc/ipc-video-service';
import { mockAppService } from './mock/mock-app-service';
import { mockJobService } from './mock/mock-job-service';
import { mockPipelineService } from './mock/mock-pipeline-service';
import { mockSettingsService } from './mock/mock-settings-service';
import { mockVideoService } from './mock/mock-video-service';

function hasVideoBridge(): boolean {
  const api = window.dubforge;
  return api !== undefined && 'video' in api;
}

function hasPipelineBridge(): boolean {
  const api = window.dubforge;
  return api !== undefined && 'pipeline' in api;
}

export const appService: AppService = mockAppService;
export const jobService: JobService = mockJobService;
export const modelService: ModelService = ipcModelService;
export const pipelineService: PipelineService = hasPipelineBridge()
  ? ipcPipelineService
  : mockPipelineService;
export const settingsService: SettingsService = mockSettingsService;
export const videoService: VideoService = hasVideoBridge() ? ipcVideoService : mockVideoService;

export {
  MOCK_APP_INFO,
  MOCK_DEFAULT_SETTINGS,
  MOCK_JOBS,
  MOCK_LANGUAGES,
  MOCK_SAMPLE_VIDEO,
} from './mock/mock-data';

export { setMockJobsSimulateError } from './mock/mock-job-service';
export { setMockSettingsSimulateError } from './mock/mock-settings-service';
