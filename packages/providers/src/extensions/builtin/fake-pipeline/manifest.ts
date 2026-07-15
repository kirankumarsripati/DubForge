import { NODE_KINDS } from '@dubforge/types';
import { EXTENSION_MANIFEST_VERSION } from '../../../runtime/constants';
import type { ExtensionManifest } from '../../../runtime/types';
import { PIPELINE_STAGE_CAPABILITY } from '../../../capabilities/pipeline-stage';

function stageCapability(id: string, key: (typeof NODE_KINDS)[keyof typeof NODE_KINDS]) {
  return {
    id,
    type: PIPELINE_STAGE_CAPABILITY,
    key,
  };
}

export const FAKE_PIPELINE_EXTENSION_ID = 'dubforge.fake-pipeline' as const;

export const fakePipelineExtensionManifest: ExtensionManifest = {
  manifestVersion: EXTENSION_MANIFEST_VERSION,
  id: FAKE_PIPELINE_EXTENSION_ID,
  name: 'Fake Pipeline Stages',
  version: '1.0.0',
  description: 'Built-in fake pipeline stage handlers for offline development and testing.',
  runtimeVersion: '>=0.1.0',
  kind: 'builtin',
  capabilities: [
    stageCapability('stage.validate', NODE_KINDS.VALIDATE),
    stageCapability('stage.fingerprint', NODE_KINDS.FINGERPRINT),
    stageCapability('stage.metadata', NODE_KINDS.METADATA),
    stageCapability('stage.extract-audio', NODE_KINDS.EXTRACT_AUDIO),
    stageCapability('stage.speech-recognition', NODE_KINDS.SPEECH_RECOGNITION),
    stageCapability('stage.english-transcript', NODE_KINDS.ENGLISH_TRANSCRIPT),
    stageCapability('stage.english-subtitle', NODE_KINDS.ENGLISH_SUBTITLE),
    stageCapability('stage.translate', NODE_KINDS.TRANSLATE),
    stageCapability('stage.subtitle', NODE_KINDS.SUBTITLE),
    stageCapability('stage.speech', NODE_KINDS.SPEECH),
    stageCapability('stage.align', NODE_KINDS.ALIGN),
    stageCapability('stage.mux', NODE_KINDS.MUX),
    stageCapability('stage.verify', NODE_KINDS.VERIFY),
    stageCapability('stage.manifest', NODE_KINDS.MANIFEST),
  ],
};
