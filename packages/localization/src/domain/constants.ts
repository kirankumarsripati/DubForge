export const LOCALIZED_DOCUMENT_VERSION = '1.0.0' as const;

export const LOCALIZATION_OPERATION_KINDS = {
  TRANSLATE: 'translate',
  BUILD_SUBTITLE: 'build-subtitle',
  BUILD_ENGLISH_SUBTITLE: 'build-english-subtitle',
} as const;

export type LocalizationOperationKind =
  (typeof LOCALIZATION_OPERATION_KINDS)[keyof typeof LOCALIZATION_OPERATION_KINDS];

export const LOCALIZATION_OPERATION_STATUSES = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const TRANSLATION_SEGMENT_SOURCES = {
  MEMORY: 'memory',
  GLOSSARY: 'glossary',
  TRANSLATOR: 'translator',
} as const;

export type TranslationSegmentSource =
  (typeof TRANSLATION_SEGMENT_SOURCES)[keyof typeof TRANSLATION_SEGMENT_SOURCES];
