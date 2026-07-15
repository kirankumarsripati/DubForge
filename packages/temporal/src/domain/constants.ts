export const AUDIO_COMPOSITION_VERSION = '1.0.0' as const;

export const TEMPORAL_OPERATION_KINDS = {
  ALIGN_AND_COMPOSE: 'align-and-compose',
} as const;

export type TemporalOperationKind =
  (typeof TEMPORAL_OPERATION_KINDS)[keyof typeof TEMPORAL_OPERATION_KINDS];

export const TEMPORAL_OPERATION_STATUSES = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const AUDIO_LAYER_KINDS = {
  SPEECH: 'speech',
  BACKGROUND: 'background',
  COMPOSED: 'composed',
} as const;

export type AudioLayerKind = (typeof AUDIO_LAYER_KINDS)[keyof typeof AUDIO_LAYER_KINDS];
