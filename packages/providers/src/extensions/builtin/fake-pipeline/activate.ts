import { NODE_KINDS, type NodeKind } from '@dubforge/types';
import type { ExtensionModule } from '../../../runtime/types';
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
} from '../../../fake/providers';
import { PIPELINE_STAGE_CAPABILITY } from '../../../capabilities/pipeline-stage';
import { fakePipelineExtensionManifest } from './manifest';

const stageProviders = {
  [NODE_KINDS.VALIDATE]: createFakeValidateProvider(),
  [NODE_KINDS.FINGERPRINT]: createFakeFingerprintProvider(),
  [NODE_KINDS.METADATA]: createFakeMetadataProvider(),
  [NODE_KINDS.THUMBNAIL]: createFakeMetadataProvider(),
  [NODE_KINDS.EXTRACT_AUDIO]: createFakeExtractAudioProvider(),
  [NODE_KINDS.SPEECH_RECOGNITION]: createFakeSpeechRecognitionProvider(),
  [NODE_KINDS.ENGLISH_TRANSCRIPT]: createFakeEnglishTranscriptProvider(),
  [NODE_KINDS.ENGLISH_SUBTITLE]: createFakeEnglishSubtitleProvider(),
  [NODE_KINDS.TRANSLATE]: createFakeTranslateProvider(),
  [NODE_KINDS.SUBTITLE]: createFakeSubtitleProvider(),
  [NODE_KINDS.SPEECH]: createFakeSpeechProvider(),
  [NODE_KINDS.ALIGN]: createFakeAlignProvider(),
  [NODE_KINDS.MUX]: createFakeMuxProvider(),
  [NODE_KINDS.VERIFY]: createFakeVerifyProvider(),
  [NODE_KINDS.MANIFEST]: createFakeManifestProvider(),
} as const;

export const fakePipelineExtensionModule: ExtensionModule = {
  activate(context): Promise<void> {
    for (const capability of fakePipelineExtensionManifest.capabilities) {
      const nodeKind = capability.key as NodeKind;
      const provider = stageProviders[nodeKind];
      context.registerCapability(
        {
          id: capability.id,
          type: PIPELINE_STAGE_CAPABILITY,
          key: capability.key,
        },
        provider,
      );
    }
    return Promise.resolve();
  },

  healthCheck(): Promise<'healthy'> {
    return Promise.resolve('healthy');
  },
};
