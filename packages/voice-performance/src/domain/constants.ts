export const VOICE_PERFORMANCE_VERSION = '1.0.0' as const;

export const VOICE_PERFORMANCE_OPERATION_KINDS = {
  SYNTHESIZE: 'synthesize',
  ALIGN: 'align',
} as const;

export type VoicePerformanceOperationKind =
  (typeof VOICE_PERFORMANCE_OPERATION_KINDS)[keyof typeof VOICE_PERFORMANCE_OPERATION_KINDS];

export const VOICE_PERFORMANCE_OPERATION_STATUSES = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const DEFAULT_VOICE_PROVIDER = 'Kokoro' as const;
