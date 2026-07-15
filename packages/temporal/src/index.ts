export { TEMPORAL_EVENTS } from './domain/events.js';

export {
  AUDIO_COMPOSITION_VERSION,
  TEMPORAL_OPERATION_KINDS,
  TEMPORAL_OPERATION_STATUSES,
  AUDIO_LAYER_KINDS,
} from './domain/constants.js';

export type { AlignmentPlan, AlignmentSegmentPlan } from './domain/alignment-plan.js';
export {
  createAlignmentPlan,
  serializeAlignmentPlan,
  deserializeAlignmentPlan,
} from './domain/alignment-plan.js';

export type { AudioLayers } from './domain/audio-layers.js';
export { createAudioLayers } from './domain/audio-layers.js';

export type { AudioComposition } from './domain/audio-composition.js';
export {
  createAudioComposition,
  serializeAudioComposition,
  deserializeAudioComposition,
} from './domain/audio-composition.js';

export type {
  LocalizedDocumentReader,
  VoicePerformanceReader,
  AudioAlignerPort,
  AudioComposerPort,
  AlignSegmentInput,
  AlignedSegmentAudio,
  ComposeLayersInput,
  ComposedAudioResult,
} from './ports/temporal-ports.js';

export { AlignmentEngine, createAlignmentEngine } from './engine/alignment-engine.js';
export { TimeStretchEngine, createTimeStretchEngine } from './engine/time-stretch-engine.js';
export { BackgroundSeparator, createBackgroundSeparator } from './engine/background-separator.js';
export { LoudnessNormalizer, createLoudnessNormalizer } from './engine/loudness-normalizer.js';
export { AudioComposer, createAudioComposer } from './engine/audio-composer.js';
export { CompositionEngine, createCompositionEngine } from './engine/composition-engine.js';

export { RubberBandAdapter, FixtureRubberBandAdapter } from './adapters/rubber-band-adapter.js';
export {
  FfmpegCompositionAdapter,
  FixtureFfmpegCompositionAdapter,
} from './adapters/ffmpeg-composition-adapter.js';

export { TemporalRepository } from './repository/temporal-repository.js';

export { TemporalSynchronizationApplication } from './application/temporal-synchronization-application.js';
export { AlignAndComposeService } from './application/temporal-services.js';

export { TemporalDiagnostics } from './diagnostics/temporal-diagnostics.js';

export {
  TemporalExecutionAdapter,
  TEMPORAL_NODE_KINDS,
  isTemporalNodeKind,
} from './integration/temporal-execution-adapter.js';
export {
  createPlatformAdapterRegistry,
  resolveGoldenFixturePath,
} from './integration/adapter-registry.js';

export {
  createTemporalPlatform,
  createLocalizedDocumentReaderFromRepository,
  createVoicePerformanceReaderFromRepository,
  type TemporalPlatform,
  type TemporalPlatformOptions,
} from './temporal-platform.js';
