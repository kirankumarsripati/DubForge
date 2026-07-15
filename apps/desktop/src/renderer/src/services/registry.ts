import type {
  AppService,
  JobService,
  ModelService,
  PipelineService,
  SettingsService,
} from '@dubforge/types';
import { mockAppService } from './mock/mock-app-service';
import { mockJobService } from './mock/mock-job-service';
import { mockModelService } from './mock/mock-model-service';
import { mockPipelineService } from './mock/mock-pipeline-service';
import { mockSettingsService } from './mock/mock-settings-service';

export const appService: AppService = mockAppService;
export const jobService: JobService = mockJobService;
export const modelService: ModelService = mockModelService;
export const pipelineService: PipelineService = mockPipelineService;
export const settingsService: SettingsService = mockSettingsService;

export {
  MOCK_APP_INFO,
  MOCK_DEFAULT_SETTINGS,
  MOCK_JOBS,
  MOCK_LANGUAGES,
  MOCK_MODELS,
  MOCK_SAMPLE_VIDEO,
} from './mock/mock-data';

export { setMockJobsSimulateError } from './mock/mock-job-service';
export { setMockModelsSimulateError } from './mock/mock-model-service';
export { setMockSettingsSimulateError } from './mock/mock-settings-service';
