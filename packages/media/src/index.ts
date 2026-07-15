export { MEDIA_EVENTS } from './domain/events.js';

export {
  MEDIA_OPERATION_KINDS,
  MEDIA_OPERATION_STATUSES,
  MEDIA_STREAM_KINDS,
  type MediaOperationKind,
  type MediaOperationStatus,
  type MediaStreamKind,
} from './domain/constants.js';

export type { MediaFile, MediaOperation, MediaStream } from './domain/entities/media-entities.js';

export { createDuration, formatDuration, type Duration } from './domain/value-objects/duration.js';
export {
  createResolution,
  formatResolution,
  resolutionLabel,
  type Resolution,
} from './domain/value-objects/resolution.js';
export { createCodec, normalizeCodecName, type Codec } from './domain/value-objects/codec.js';
export {
  createContainerFormat,
  primaryContainerFormat,
  type ContainerFormat,
} from './domain/value-objects/container-format.js';

export type {
  ProbeMediaInput,
  ProbeMediaResult,
  ProbeMediaPort,
  ExtractAudioInput,
  ExtractAudioResult,
  ExtractAudioPort,
  MuxMediaInput,
  MuxMediaResult,
  MuxMediaPort,
  MediaProbeSnapshot,
} from './ports/media-ports.js';

export { MediaRepository, type CreateMediaFileInput } from './repository/media-repository.js';

export { MediaApplication } from './application/media-application.js';
export {
  ImportMediaService,
  type ImportMediaProbeInput,
  type ImportMediaProbeResult,
} from './application/import-media-service.js';
export {
  ProbeMediaService,
  ExtractAudioService,
  MuxMediaService,
} from './application/media-services.js';

export {
  FfprobeDiagnosticsCollector,
  type FfprobeDiagnosticRecord,
} from './diagnostics/ffprobe-diagnostics.js';
export { MediaDiagnostics, type MediaDiagnosticEntry } from './diagnostics/media-diagnostics.js';

export { FfmpegProbeAdapter } from './adapters/ffmpeg/ffmpeg-probe-adapter.js';
export { FfmpegExtractAudioAdapter } from './adapters/ffmpeg/ffmpeg-extract-audio-adapter.js';
export { FfmpegMuxAdapter } from './adapters/ffmpeg/ffmpeg-mux-adapter.js';
export { FixtureProbeAdapter } from './adapters/ffmpeg/fixture-probe-adapter.js';
export { FixtureExtractAudioAdapter } from './adapters/ffmpeg/fixture-extract-audio-adapter.js';
export { FixtureMuxAdapter } from './adapters/ffmpeg/fixture-mux-adapter.js';

export {
  MediaExecutionAdapter,
  MEDIA_NODE_KINDS,
  isMediaNodeKind,
} from './integration/media-execution-adapter.js';
export { createMediaAwareAdapterRegistry } from './integration/adapter-registry.js';

export {
  createMediaPlatform,
  type MediaPlatform,
  type MediaPlatformOptions,
  type MediaPlatformPorts,
} from './media-platform.js';
