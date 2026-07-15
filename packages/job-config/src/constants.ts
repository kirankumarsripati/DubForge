import type { LanguageSelection, TranslationProfileDefinition, Voice } from './types';

export const SOURCE_LANGUAGE_CODE = 'en' as const;

export const DEFAULT_LANGUAGES: readonly LanguageSelection[] = [
  { code: 'en', label: 'English', enabled: true, isSource: true },
  { code: 'hi', label: 'Hindi', enabled: true, isSource: false },
  { code: 'te', label: 'Telugu', enabled: true, isSource: false },
  { code: 'ta', label: 'Tamil', enabled: false, isSource: false },
  { code: 'kn', label: 'Kannada', enabled: false, isSource: false },
  { code: 'mr', label: 'Marathi', enabled: false, isSource: false },
  { code: 'gu', label: 'Gujarati', enabled: false, isSource: false },
  { code: 'bn', label: 'Bengali', enabled: false, isSource: false },
  { code: 'pa', label: 'Punjabi', enabled: false, isSource: false },
];

export const MOCK_VOICES: readonly Voice[] = [
  {
    id: 'en-female-1',
    label: 'Aria',
    languageCode: 'en',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'high',
  },
  {
    id: 'en-male-1',
    label: 'Marcus',
    languageCode: 'en',
    gender: 'male',
    provider: 'Kokoro',
    quality: 'high',
  },
  {
    id: 'hi-female-1',
    label: 'Ananya',
    languageCode: 'hi',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'high',
  },
  {
    id: 'hi-male-1',
    label: 'Arjun',
    languageCode: 'hi',
    gender: 'male',
    provider: 'Kokoro',
    quality: 'standard',
  },
  {
    id: 'te-female-1',
    label: 'Lakshmi',
    languageCode: 'te',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'high',
  },
  {
    id: 'te-male-1',
    label: 'Ravi',
    languageCode: 'te',
    gender: 'male',
    provider: 'Kokoro',
    quality: 'standard',
  },
  {
    id: 'ta-female-1',
    label: 'Meera',
    languageCode: 'ta',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'high',
  },
  {
    id: 'kn-female-1',
    label: 'Divya',
    languageCode: 'kn',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'standard',
  },
  {
    id: 'mr-female-1',
    label: 'Sneha',
    languageCode: 'mr',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'standard',
  },
  {
    id: 'gu-female-1',
    label: 'Kavya',
    languageCode: 'gu',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'standard',
  },
  {
    id: 'bn-female-1',
    label: 'Riya',
    languageCode: 'bn',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'standard',
  },
  {
    id: 'pa-female-1',
    label: 'Simran',
    languageCode: 'pa',
    gender: 'female',
    provider: 'Kokoro',
    quality: 'standard',
  },
];

export const TRANSLATION_PROFILES: Record<
  TranslationProfileDefinition['id'],
  TranslationProfileDefinition
> = {
  fast: {
    id: 'fast',
    label: 'Fast',
    description: 'Lower quality, fastest processing',
    timeMultiplier: 0.6,
    qualityLabel: 'Good',
    models: {
      whisper: 'Whisper Medium',
      translator: 'SeamlessM4T',
      speech: 'Kokoro Standard',
    },
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    description: 'Recommended for most videos',
    timeMultiplier: 1,
    qualityLabel: 'Better',
    models: {
      whisper: 'Whisper Large v3',
      translator: 'SeamlessM4T',
      speech: 'Kokoro',
    },
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    description: 'Highest quality, longest processing',
    timeMultiplier: 1.8,
    qualityLabel: 'Best',
    models: {
      whisper: 'Whisper Large v3',
      translator: 'SeamlessM4T',
      speech: 'Kokoro Premium',
    },
  },
};
