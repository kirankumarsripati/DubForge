import { ASSET_CATEGORIES, ASSET_KINDS } from '../types.js';
import type { CreateAssetInput } from '../types.js';

export const DEFAULT_ASSET_CATALOG: readonly CreateAssetInput[] = [
  {
    id: 'whisper-base',
    name: 'Whisper Base',
    kind: ASSET_KINDS.MODEL,
    category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
    version: '1.0.0',
    sourceUrl: null,
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small',
    kind: ASSET_KINDS.MODEL,
    category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
    version: '1.0.0',
    sourceUrl: null,
  },
  {
    id: 'nllb-600m',
    name: 'NLLB 600M',
    kind: ASSET_KINDS.MODEL,
    category: ASSET_CATEGORIES.TRANSLATION,
    version: '1.0.0',
    sourceUrl: null,
  },
  {
    id: 'piper-en',
    name: 'Piper English',
    kind: ASSET_KINDS.MODEL,
    category: ASSET_CATEGORIES.SPEECH,
    version: '1.0.0',
    sourceUrl: null,
  },
];

export const DEFAULT_ASSET_DEPENDENCIES: readonly {
  readonly assetId: string;
  readonly dependsOnAssetId: string;
  readonly optional: boolean;
}[] = [
  {
    assetId: 'whisper-small',
    dependsOnAssetId: 'whisper-base',
    optional: true,
  },
];
