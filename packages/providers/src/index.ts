export const PROVIDERS_VERSION = '0.1.0' as const;

export { DefaultProviderRegistry, ProviderNotFoundError, createProviderRegistry } from './registry';

export type {
  CancellationSignal,
  ProviderRegistry,
  StageExecutionContext,
  StageExecutionResult,
  StageProvider,
} from './types';

export { registerFakeProviders } from './fake/register';

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
