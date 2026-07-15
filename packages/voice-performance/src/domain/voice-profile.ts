import { DEFAULT_VOICE_PROVIDER } from './constants.js';

export interface VoiceProfile {
  readonly id: string;
  readonly label: string;
  readonly languageCode: string;
  readonly provider: typeof DEFAULT_VOICE_PROVIDER;
  readonly quality: 'standard' | 'high';
}

export function createVoiceProfile(input: {
  readonly id: string;
  readonly label: string;
  readonly languageCode: string;
  readonly quality?: 'standard' | 'high';
}): VoiceProfile {
  return {
    id: input.id,
    label: input.label,
    languageCode: input.languageCode,
    provider: DEFAULT_VOICE_PROVIDER,
    quality: input.quality ?? 'high',
  };
}
