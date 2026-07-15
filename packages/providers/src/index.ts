export const PROVIDERS_VERSION = '0.1.0' as const;

export {
  EXTENSION_MANIFEST_FILENAME,
  EXTENSION_MANIFEST_VERSION,
  EXTENSION_RUNTIME_VERSION,
} from './runtime/constants';

export { PIPELINE_STAGE_CAPABILITY } from './capabilities/pipeline-stage';
export type { PipelineStageCapabilityHandler } from './capabilities/pipeline-stage';

export type {
  CancellationSignal,
  StageExecutionContext,
  StageExecutionResult,
} from './stage/types';

export {
  CapabilityNotFoundError,
  ExtensionAlreadyRegisteredError,
  ExtensionRegistry,
  createCapabilityKey,
} from './runtime/registry';

export { ExtensionLoadError, ExtensionLoader, collectHealthReports } from './runtime/loader';

export { createExtensionRuntime, DefaultExtensionRuntime } from './runtime/runtime';

export { discoverExtensions } from './runtime/discovery';

export {
  extensionManifestSchema,
  parseExtensionManifest,
  validateExtensionManifest,
  validateParsedManifest,
} from './runtime/manifest';

export { checkRuntimeCompatibility } from './runtime/version';

export type {
  ExtensionActivationContext,
  ExtensionCapabilityDeclaration,
  ExtensionDiscoveryResult,
  ExtensionHealthReport,
  ExtensionHealthStatus,
  ExtensionKind,
  ExtensionManifest,
  ExtensionModule,
  ExtensionRuntime,
  ExtensionValidationIssue,
  ExtensionValidationResult,
  LoadedExtension,
  RegisteredCapability,
} from './runtime/types';

export { EXTENSION_HEALTH_STATUSES, EXTENSION_KINDS } from './runtime/types';

export { loadBuiltinExtensions, createConfiguredExtensionRuntime } from './extensions/bootstrap';

export {
  fakePipelineExtensionManifest,
  FAKE_PIPELINE_EXTENSION_ID,
} from './extensions/builtin/fake-pipeline/manifest';

export { fakePipelineExtensionModule } from './extensions/builtin/fake-pipeline/activate';

export {
  createFakeAlignProvider,
  createFakeEnglishSubtitleProvider,
  createFakeEnglishTranscriptProvider,
  createFakeExtractAudioProvider,
  createFakeFingerprintProvider,
  createFakeManifestProvider,
  createFakeMetadataProvider,
  createFakeMuxProvider,
  createFakeSpeechProvider,
  createFakeSpeechRecognitionProvider,
  createFakeSubtitleProvider,
  createFakeTranslateProvider,
  createFakeValidateProvider,
  createFakeVerifyProvider,
} from './fake/providers';

export { getSimulatedDurationMs, simulateWork, sleep } from './fake/timing';
