export { TRANSCRIPTION_EVENTS } from './domain/events.js';

export {
  TRANSCRIPTION_OPERATION_KINDS,
  TRANSCRIPTION_OPERATION_STATUSES,
  TRANSCRIPT_SOURCES,
  CANONICAL_TRANSCRIPT_VERSION,
} from './domain/constants.js';

export type {
  CanonicalSegment,
  CanonicalTranscript,
  CreateCanonicalTranscriptInput,
} from './domain/canonical-transcript.js';
export {
  createCanonicalSegment,
  createCanonicalTranscript,
  serializeCanonicalTranscript,
  deserializeCanonicalTranscript,
} from './domain/canonical-transcript.js';

export type { RichText, RichTextSpan } from './domain/rich-text.js';
export {
  createRichTextFromPlainText,
  richTextToPlainText,
  richTextFromSegments,
} from './domain/rich-text.js';

export type {
  TranscriptAggregate,
  TranscriptQualityReport,
} from './domain/transcript-aggregate.js';
export { createTranscriptAggregate } from './domain/transcript-aggregate.js';

export type {
  RecognizeSpeechInput,
  RecognizeSpeechResult,
  RecognizeSpeechPort,
  TranslateTranscriptInput,
  TranslateTranscriptPort,
} from './ports/transcription-ports.js';

export { LocalizationRepository } from './repository/localization-repository.js';

export {
  TranscriptProcessingPlatform,
  createTranscriptProcessingPlatform,
} from './processing/transcript-processing-platform.js';
export {
  normalizeCanonicalTranscript,
  buildCanonicalTranscriptFromSeconds,
} from './processing/normalization.js';
export { mergeAdjacentSegments } from './processing/segment-merger.js';
export { splitLongSegments } from './processing/segment-splitter.js';
export {
  buildSrtCaptions,
  buildWebVttCaptions,
  buildPlainTranscript,
} from './processing/caption-builder.js';
export { analyzeTranscriptQuality } from './processing/quality-analyzer.js';

export { TranscriptionApplication } from './application/transcription-application.js';
export {
  RecognizeSpeechService,
  BuildTranscriptService,
  TranslateTranscriptService,
} from './application/transcription-services.js';

export { TranscriptionDiagnostics } from './diagnostics/transcription-diagnostics.js';

export {
  TranscriptionExecutionAdapter,
  TRANSCRIPTION_NODE_KINDS,
  isTranscriptionNodeKind,
} from './integration/transcription-execution-adapter.js';
export { createPlatformAdapterRegistry } from './integration/adapter-registry.js';

export {
  createTranscriptionPlatform,
  type TranscriptionPlatform,
  type TranscriptionPlatformOptions,
} from './transcription-platform.js';
