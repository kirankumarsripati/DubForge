export const PIPELINE_IPC_CHANNELS = {
  START_JOB: 'pipeline:start-job',
  CANCEL_JOB: 'pipeline:cancel-job',
  GET_ACTIVE_JOB: 'pipeline:get-active-job',
  SUBSCRIBE_EVENTS: 'pipeline:subscribe-events',
  EVENT: 'pipeline:event',
} as const;

export type PipelineIpcChannel = (typeof PIPELINE_IPC_CHANNELS)[keyof typeof PIPELINE_IPC_CHANNELS];
