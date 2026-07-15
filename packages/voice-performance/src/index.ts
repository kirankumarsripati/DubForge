export { VOICE_PERFORMANCE_EVENTS } from './domain/events.js';

export {
  VOICE_PERFORMANCE_VERSION,
  VOICE_PERFORMANCE_OPERATION_KINDS,
  VOICE_PERFORMANCE_OPERATION_STATUSES,
  DEFAULT_VOICE_PROVIDER,
} from './domain/constants.js';

export type { VoiceProfile } from './domain/voice-profile.js';
export { createVoiceProfile } from './domain/voice-profile.js';

export type { PerformanceSegment } from './domain/performance-segment.js';
export { createPerformanceSegment } from './domain/performance-segment.js';

export type { VoicePerformance, CreateVoicePerformanceInput } from './domain/voice-performance.js';
export {
  createVoicePerformance,
  serializeVoicePerformance,
  deserializeVoicePerformance,
} from './domain/voice-performance.js';

export type {
  LocalizedDocumentReader,
  PronunciationEntry,
  SpeechSynthesizerPort,
  SynthesizeSegmentInput,
  SynthesizedSegmentAudio,
  PlannedSegment,
  PerformancePlan,
} from './ports/voice-performance-ports.js';

export {
  PronunciationResolver,
  createPronunciationResolver,
} from './engine/pronunciation-resolver.js';
export { PerformancePlanner, createPerformancePlanner } from './engine/performance-planner.js';
export { AudioPostProcessor, createAudioPostProcessor } from './engine/audio-post-processor.js';
export { AudioStitcher, createAudioStitcher } from './engine/audio-stitcher.js';
export {
  SpeechSynthesisEngine,
  createSpeechSynthesisEngine,
} from './engine/speech-synthesis-engine.js';

export { VoicePerformanceRepository } from './repository/voice-performance-repository.js';

export { VoicePerformanceApplication } from './application/voice-performance-application.js';
export {
  SynthesizeSpeechService,
  AlignSpeechService,
} from './application/voice-performance-services.js';

export { VoicePerformanceDiagnostics } from './diagnostics/voice-performance-diagnostics.js';

export {
  VoicePerformanceExecutionAdapter,
  VOICE_PERFORMANCE_NODE_KINDS,
  isVoicePerformanceNodeKind,
} from './integration/voice-performance-execution-adapter.js';
export {
  createPlatformAdapterRegistry,
  resolveGoldenFixturePath,
} from './integration/adapter-registry.js';

export {
  createVoicePerformancePlatform,
  createLocalizedDocumentReaderFromRepository,
  type VoicePerformancePlatform,
  type VoicePerformancePlatformOptions,
} from './voice-performance-platform.js';
