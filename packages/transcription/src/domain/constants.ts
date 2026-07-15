export const TRANSCRIPTION_OPERATION_KINDS = {
  RECOGNIZE: 'recognize',
  BUILD_TRANSCRIPT: 'build-transcript',
  TRANSLATE: 'translate',
} as const;

export type TranscriptionOperationKind =
  (typeof TRANSCRIPTION_OPERATION_KINDS)[keyof typeof TRANSCRIPTION_OPERATION_KINDS];

export const TRANSCRIPTION_OPERATION_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TranscriptionOperationStatus =
  (typeof TRANSCRIPTION_OPERATION_STATUSES)[keyof typeof TRANSCRIPTION_OPERATION_STATUSES];

export const TRANSCRIPT_SOURCES = {
  SPEECH_RECOGNITION: 'speech-recognition',
  TRANSLATION: 'translation',
} as const;

export type TranscriptSource = (typeof TRANSCRIPT_SOURCES)[keyof typeof TRANSCRIPT_SOURCES];

export const CANONICAL_TRANSCRIPT_VERSION = '1.0.0' as const;
