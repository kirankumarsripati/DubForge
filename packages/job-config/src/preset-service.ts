import { DEFAULT_OUTPUT_CONFIGURATION } from './job-definition';
import { DEFAULT_LANGUAGES } from './constants';
import type { JobDefinition, JobPreset, PresetService, SavePresetInput } from './types';

const BUILT_IN_PRESETS: readonly JobPreset[] = [
  {
    id: 'preset-dual-indic',
    name: 'Hindi + Telugu',
    description: 'Dub and subtitle Hindi and Telugu with balanced quality.',
    languages: DEFAULT_LANGUAGES.map((language) => ({
      ...language,
      enabled: language.code === 'en' || language.code === 'hi' || language.code === 'te',
    })),
    voices: {
      en: 'en-female-1',
      hi: 'hi-female-1',
      te: 'te-female-1',
    },
    profile: 'balanced',
    output: DEFAULT_OUTPUT_CONFIGURATION,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'preset-subtitles-only',
    name: 'Subtitles Only',
    description: 'Generate subtitles without dubbed audio tracks.',
    languages: DEFAULT_LANGUAGES.map((language) => ({
      ...language,
      enabled: language.code === 'en' || language.code === 'hi' || language.code === 'te',
    })),
    voices: {
      en: 'en-female-1',
      hi: 'hi-female-1',
      te: 'te-female-1',
    },
    profile: 'fast',
    output: {
      ...DEFAULT_OUTPUT_CONFIGURATION,
      generateTranslatedAudio: false,
      exportSrt: true,
    },
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'preset-studio',
    name: 'Studio Quality',
    description: 'Highest quality dubbing with full artifact export.',
    languages: DEFAULT_LANGUAGES.map((language) => ({
      ...language,
      enabled: language.code === 'en' || language.code === 'hi',
    })),
    voices: {
      en: 'en-female-1',
      hi: 'hi-female-1',
    },
    profile: 'studio',
    output: {
      ...DEFAULT_OUTPUT_CONFIGURATION,
      exportSrt: true,
      exportTranscript: true,
    },
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
];

function createPresetId(): string {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPresetService(
  initialPresets: readonly JobPreset[] = BUILT_IN_PRESETS,
): PresetService {
  const presets = new Map<string, JobPreset>(initialPresets.map((preset) => [preset.id, preset]));

  return {
    listPresets(): readonly JobPreset[] {
      return [...presets.values()].sort((left, right) => left.name.localeCompare(right.name));
    },

    getPreset(id: string): JobPreset | null {
      return presets.get(id) ?? null;
    },

    savePreset(definition: JobDefinition, input: SavePresetInput): JobPreset {
      const timestamp = new Date().toISOString();
      const preset: JobPreset = {
        id: createPresetId(),
        name: input.name.trim(),
        description: input.description.trim(),
        languages: definition.languages.map((language) => ({ ...language })),
        voices: { ...definition.voices },
        profile: definition.profile,
        output: { ...definition.output },
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      presets.set(preset.id, preset);
      return preset;
    },

    deletePreset(id: string): void {
      presets.delete(id);
    },

    applyPreset(preset: JobPreset, definition: JobDefinition): JobDefinition {
      return {
        ...definition,
        languages: preset.languages.map((language) => ({ ...language })),
        voices: { ...preset.voices },
        profile: preset.profile,
        output: { ...preset.output },
      };
    },
  };
}
