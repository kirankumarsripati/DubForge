import type { OutputOptions, TranslationProfile } from '@dubforge/types';
import { DEFAULT_LANGUAGES, MOCK_VOICES, SOURCE_LANGUAGE_CODE } from './constants';
import type {
  JobDefinition,
  LanguageSelection,
  OutputConfiguration,
  Voice,
  VoiceSelection,
} from './types';

export const DEFAULT_OUTPUT_CONFIGURATION: OutputConfiguration = {
  generateTranslatedAudio: true,
  generateSubtitles: true,
  embedSubtitles: true,
  exportSrt: false,
  exportTranscript: true,
  containerFormat: 'mkv',
};

export function getEnabledLanguages(
  languages: readonly LanguageSelection[],
): readonly LanguageSelection[] {
  return languages.filter((language) => language.enabled);
}

export function getTargetLanguages(
  languages: readonly LanguageSelection[],
): readonly LanguageSelection[] {
  return languages.filter((language) => language.enabled && !language.isSource);
}

export function getVoicesForLanguage(
  voices: readonly Voice[],
  languageCode: string,
): readonly Voice[] {
  return voices.filter((voice) => voice.languageCode === languageCode);
}

export function createDefaultVoiceSelection(
  languages: readonly LanguageSelection[],
  voices: readonly Voice[] = MOCK_VOICES,
): VoiceSelection {
  const selection: Record<string, string> = {};

  for (const language of languages) {
    if (!language.enabled) {
      continue;
    }

    const languageVoices = getVoicesForLanguage(voices, language.code);
    const defaultVoice = languageVoices[0];
    if (defaultVoice !== undefined) {
      selection[language.code] = defaultVoice.id;
    }
  }

  return selection;
}

export function createJobDefinition(partial: Partial<JobDefinition> = {}): JobDefinition {
  const languages = partial.languages ?? DEFAULT_LANGUAGES;

  return {
    video: partial.video ?? null,
    languages,
    voices: partial.voices ?? createDefaultVoiceSelection(languages),
    profile: partial.profile ?? 'balanced',
    output: partial.output ?? DEFAULT_OUTPUT_CONFIGURATION,
    outputDirectory: partial.outputDirectory ?? '~/Movies/DubForge',
  };
}

export function updateJobDefinition(
  definition: JobDefinition,
  partial: Partial<JobDefinition>,
): JobDefinition {
  const nextLanguages = partial.languages ?? definition.languages;
  const languagesChanged = partial.languages !== undefined;
  const nextVoices = languagesChanged
    ? reconcileVoiceSelection(nextLanguages, definition.voices)
    : (partial.voices ?? definition.voices);

  return {
    video: partial.video !== undefined ? partial.video : definition.video,
    languages: nextLanguages,
    voices: nextVoices,
    profile: partial.profile ?? definition.profile,
    output: partial.output ?? definition.output,
    outputDirectory: partial.outputDirectory ?? definition.outputDirectory,
  };
}

export function reconcileVoiceSelection(
  languages: readonly LanguageSelection[],
  voices: VoiceSelection,
  availableVoices: readonly Voice[] = MOCK_VOICES,
): VoiceSelection {
  const nextSelection: Record<string, string> = {};

  for (const language of languages) {
    if (!language.enabled) {
      continue;
    }

    const existingVoiceId = voices[language.code];
    const languageVoices = getVoicesForLanguage(availableVoices, language.code);
    const existingVoice = languageVoices.find((voice) => voice.id === existingVoiceId);
    const defaultVoice = languageVoices[0];

    if (existingVoice !== undefined) {
      nextSelection[language.code] = existingVoice.id;
    } else if (defaultVoice !== undefined) {
      nextSelection[language.code] = defaultVoice.id;
    }
  }

  return nextSelection;
}

export function toggleLanguageSelection(definition: JobDefinition, code: string): JobDefinition {
  const nextLanguages = definition.languages.map((language) =>
    language.code === code ? { ...language, enabled: !language.enabled } : language,
  );

  return updateJobDefinition(definition, { languages: nextLanguages });
}

export function setLanguageVoice(
  definition: JobDefinition,
  languageCode: string,
  voiceId: string,
): JobDefinition {
  return updateJobDefinition(definition, {
    voices: {
      ...definition.voices,
      [languageCode]: voiceId,
    },
  });
}

export function setTranslationProfile(
  definition: JobDefinition,
  profile: TranslationProfile,
): JobDefinition {
  return updateJobDefinition(definition, { profile });
}

export function setOutputConfiguration(
  definition: JobDefinition,
  partial: Partial<OutputOptions & Pick<OutputConfiguration, 'containerFormat'>>,
): JobDefinition {
  const nextOutput: OutputConfiguration = {
    ...definition.output,
    ...partial,
  };

  const normalizedOutput = normalizeOutputConfiguration(nextOutput);
  return updateJobDefinition(definition, { output: normalizedOutput });
}

export function normalizeOutputConfiguration(output: OutputConfiguration): OutputConfiguration {
  const generateSubtitles = output.generateSubtitles;
  const generateTranslatedAudio = output.generateTranslatedAudio;

  return {
    ...output,
    embedSubtitles: generateSubtitles ? output.embedSubtitles : false,
    exportSrt: generateSubtitles ? output.exportSrt : false,
    generateTranslatedAudio,
    generateSubtitles,
  };
}

export function isSourceLanguage(language: LanguageSelection): boolean {
  return language.isSource || language.code === SOURCE_LANGUAGE_CODE;
}
