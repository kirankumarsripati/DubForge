import {
  createEstimationService,
  createPresetService,
  createValidationService,
} from '@dubforge/job-config';

export const estimationService = createEstimationService();
export const validationService = createValidationService();
export const presetService = createPresetService();
