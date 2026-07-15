export const DELIVERY_VERSION = '1.0.0' as const;

export const PROJECT_BUNDLE_VERSION = '1.0.0' as const;

export const DELIVERY_OPERATION_KINDS = {
  VERIFY: 'verify',
  PACKAGE: 'package',
} as const;

export type DeliveryOperationKind =
  (typeof DELIVERY_OPERATION_KINDS)[keyof typeof DELIVERY_OPERATION_KINDS];

export const DELIVERY_OPERATION_STATUSES = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const DELIVERABLE_KINDS = {
  MKV: 'mkv',
  MP4: 'mp4',
  AUDIO_ONLY: 'audio-only',
  SUBTITLE_PACKAGE: 'subtitle-package',
  PROJECT_BUNDLE: 'project-bundle',
  VALIDATION_REPORT: 'validation-report',
} as const;

export type DeliverableKind = (typeof DELIVERABLE_KINDS)[keyof typeof DELIVERABLE_KINDS];

export const DELIVERABLE_STATUSES = {
  PLANNED: 'planned',
  EXPORTING: 'exporting',
  VALIDATING: 'validating',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[keyof typeof DELIVERABLE_STATUSES];

export const PACKAGING_PLAN_STATUSES = {
  DRAFT: 'draft',
  VALIDATED: 'validated',
  PREVIEWED: 'previewed',
  EXECUTING: 'executing',
  VERIFYING: 'verifying',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type PackagingPlanStatus =
  (typeof PACKAGING_PLAN_STATUSES)[keyof typeof PACKAGING_PLAN_STATUSES];

export const DEFAULT_EXPORT_PROFILE_ID = 'local-playback' as const;

export const BUILTIN_EXPORT_PROFILE_IDS = [
  'studio-archive',
  'youtube',
  'plex',
  'jellyfin',
  'local-playback',
  'mobile',
  'audio-only',
] as const;

export type BuiltinExportProfileId = (typeof BUILTIN_EXPORT_PROFILE_IDS)[number];
