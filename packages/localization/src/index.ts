export { LOCALIZATION_EVENTS } from './domain/events.js';

export {
  LOCALIZED_DOCUMENT_VERSION,
  LOCALIZATION_OPERATION_KINDS,
  LOCALIZATION_OPERATION_STATUSES,
  TRANSLATION_SEGMENT_SOURCES,
} from './domain/constants.js';

export type {
  LocalizedSegment,
  LocalizedDocument,
  CreateLocalizedDocumentInput,
} from './domain/localized-document.js';
export {
  createLocalizedSegment,
  createLocalizedDocument,
  serializeLocalizedDocument,
  deserializeLocalizedDocument,
} from './domain/localized-document.js';

export type {
  LocalizationQualityReport,
  LocalizedDocumentAggregate,
} from './domain/localized-document-aggregate.js';
export { createLocalizedDocumentAggregate } from './domain/localized-document-aggregate.js';

export type {
  CanonicalTranscriptReader,
  TranslatorPort,
  TranslatorSegmentInput,
  TranslatorSegmentOutput,
  TranslateSegmentsInput,
  GlossaryEntry,
  TranslationMemoryEntry,
} from './ports/localization-ports.js';

export { LocalizationRepository } from './repository/localization-repository.js';

export { applyGlossaryToText } from './engine/glossary-engine.js';
export { analyzeLocalizationQuality } from './engine/quality-engine.js';
export { LocalizationEngine, createLocalizationEngine } from './engine/localization-engine.js';
export {
  buildSrtFromLocalizedDocument,
  buildPlainFromLocalizedDocument,
} from './engine/caption-builder.js';
export { localizedDocumentToCanonicalTranscript } from './engine/canonical-bridge.js';

export { LocalizationApplication } from './application/localization-application.js';
export {
  TranslateDocumentService,
  BuildSubtitleService,
} from './application/localization-services.js';

export { LocalizationDiagnostics } from './diagnostics/localization-diagnostics.js';

export {
  LocalizationExecutionAdapter,
  LOCALIZATION_NODE_KINDS,
  isLocalizationNodeKind,
} from './integration/localization-execution-adapter.js';
export { resolveGoldenFixturePath } from './integration/adapter-registry.js';

export {
  createLocalizationPlatform,
  createTranscriptReaderFromRepository,
  type LocalizationPlatform,
  type LocalizationPlatformOptions,
} from './localization-platform.js';
