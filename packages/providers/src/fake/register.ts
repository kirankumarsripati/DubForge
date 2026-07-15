import { NODE_KINDS } from '@dubforge/types';
import type { ProviderRegistry } from '../types';
import {
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
} from './providers';

export function registerFakeProviders(registry: ProviderRegistry): void {
  registry.register(NODE_KINDS.VALIDATE, createFakeValidateProvider());
  registry.register(NODE_KINDS.FINGERPRINT, createFakeFingerprintProvider());
  registry.register(NODE_KINDS.METADATA, createFakeMetadataProvider());
  registry.register(NODE_KINDS.EXTRACT_AUDIO, createFakeExtractAudioProvider());
  registry.register(NODE_KINDS.SPEECH_RECOGNITION, createFakeSpeechRecognitionProvider());
  registry.register(NODE_KINDS.ENGLISH_TRANSCRIPT, createFakeEnglishTranscriptProvider());
  registry.register(NODE_KINDS.ENGLISH_SUBTITLE, createFakeEnglishSubtitleProvider());
  registry.register(NODE_KINDS.TRANSLATE, createFakeTranslateProvider());
  registry.register(NODE_KINDS.SUBTITLE, createFakeSubtitleProvider());
  registry.register(NODE_KINDS.SPEECH, createFakeSpeechProvider());
  registry.register(NODE_KINDS.ALIGN, createFakeAlignProvider());
  registry.register(NODE_KINDS.MUX, createFakeMuxProvider());
  registry.register(NODE_KINDS.VERIFY, createFakeVerifyProvider());
  registry.register(NODE_KINDS.MANIFEST, createFakeManifestProvider());
}
