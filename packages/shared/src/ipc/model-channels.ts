export const MODEL_IPC_CHANNELS = {
  LIST_MODELS: 'models:list',
  DOWNLOAD_MODEL: 'models:download',
  DELETE_MODEL: 'models:delete',
  UPDATE_MODEL: 'models:update',
  VERIFY_MODEL: 'models:verify',
  REPAIR_MODEL: 'models:repair',
  GET_DIAGNOSTICS: 'models:get-diagnostics',
  SUBSCRIBE_EVENTS: 'models:subscribe-events',
  EVENT: 'models:event',
} as const;

export type ModelIpcChannel = (typeof MODEL_IPC_CHANNELS)[keyof typeof MODEL_IPC_CHANNELS];
