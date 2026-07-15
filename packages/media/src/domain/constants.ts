export const MEDIA_OPERATION_KINDS = {
  FINGERPRINT: 'fingerprint',
  PROBE: 'probe',
  THUMBNAIL: 'thumbnail',
  EXTRACT_AUDIO: 'extract-audio',
  MUX: 'mux',
} as const;

export const MEDIA_IMPORT_NODE_IDS = {
  FINGERPRINT: 'fingerprint',
  METADATA: 'metadata',
  THUMBNAIL: 'thumbnail',
  EXTRACT_AUDIO: 'extract-audio',
} as const;

export type MediaOperationKind = (typeof MEDIA_OPERATION_KINDS)[keyof typeof MEDIA_OPERATION_KINDS];

export const MEDIA_OPERATION_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type MediaOperationStatus =
  (typeof MEDIA_OPERATION_STATUSES)[keyof typeof MEDIA_OPERATION_STATUSES];

export const MEDIA_STREAM_KINDS = {
  VIDEO: 'video',
  AUDIO: 'audio',
} as const;

export type MediaStreamKind = (typeof MEDIA_STREAM_KINDS)[keyof typeof MEDIA_STREAM_KINDS];
