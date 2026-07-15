import { MOCK_VOICES } from './constants';
import { getEnabledLanguages, getTargetLanguages, getVoicesForLanguage } from './job-definition';
import type {
  JobDefinition,
  JobValidationIssue,
  JobValidationResult,
  ValidationService,
} from './types';

function hasEnabledOutput(definition: JobDefinition): boolean {
  const output = definition.output;
  return (
    output.generateTranslatedAudio ||
    output.generateSubtitles ||
    output.exportTranscript ||
    output.exportSrt
  );
}

function validateVoices(definition: JobDefinition): readonly JobValidationIssue[] {
  const issues: JobValidationIssue[] = [];

  if (!definition.output.generateTranslatedAudio) {
    return issues;
  }

  const languagesRequiringVoice = getEnabledLanguages(definition.languages);

  for (const language of languagesRequiringVoice) {
    const selectedVoiceId = definition.voices[language.code];
    const availableVoices = getVoicesForLanguage(MOCK_VOICES, language.code);

    if (availableVoices.length === 0) {
      issues.push({
        code: 'voice-unavailable',
        field: `voices.${language.code}`,
        message: `No voices are available for ${language.label}.`,
        severity: 'error',
      });
      continue;
    }

    if (selectedVoiceId === undefined) {
      issues.push({
        code: 'voice-missing',
        field: `voices.${language.code}`,
        message: `Select a voice for ${language.label}.`,
        severity: 'error',
      });
      continue;
    }

    const selectedVoice = availableVoices.find((voice) => voice.id === selectedVoiceId);
    if (selectedVoice === undefined) {
      issues.push({
        code: 'voice-invalid',
        field: `voices.${language.code}`,
        message: `The selected voice for ${language.label} is not available.`,
        severity: 'error',
      });
    }
  }

  return issues;
}

export function createValidationService(): ValidationService {
  return {
    validate(definition: JobDefinition): JobValidationResult {
      const issues: JobValidationIssue[] = [];

      if (definition.video === null) {
        issues.push({
          code: 'video-missing',
          field: 'video',
          message: 'Select a video before starting localization.',
          severity: 'error',
        });
      }

      const enabledLanguages = getEnabledLanguages(definition.languages);
      const targetLanguages = getTargetLanguages(definition.languages);

      if (enabledLanguages.length === 0) {
        issues.push({
          code: 'languages-empty',
          field: 'languages',
          message: 'Enable at least one language.',
          severity: 'error',
        });
      }

      if (targetLanguages.length === 0) {
        issues.push({
          code: 'targets-empty',
          field: 'languages',
          message: 'Enable at least one translation language in addition to the source language.',
          severity: 'error',
        });
      }

      if (definition.outputDirectory.trim().length === 0) {
        issues.push({
          code: 'output-directory-empty',
          field: 'outputDirectory',
          message: 'Choose an output folder in Settings.',
          severity: 'error',
        });
      }

      if (!hasEnabledOutput(definition)) {
        issues.push({
          code: 'output-empty',
          field: 'output',
          message: 'Enable at least one output artifact.',
          severity: 'error',
        });
      }

      if (definition.output.embedSubtitles && !definition.output.generateSubtitles) {
        issues.push({
          code: 'embed-without-subtitles',
          field: 'output.embedSubtitles',
          message: 'Subtitle embedding requires subtitle generation.',
          severity: 'error',
        });
      }

      if (definition.output.exportSrt && !definition.output.generateSubtitles) {
        issues.push({
          code: 'export-srt-without-subtitles',
          field: 'output.exportSrt',
          message: 'SRT export requires subtitle generation.',
          severity: 'error',
        });
      }

      if (definition.output.generateTranslatedAudio && targetLanguages.length === 0) {
        issues.push({
          code: 'audio-without-targets',
          field: 'output.generateTranslatedAudio',
          message: 'Translated audio requires at least one target language.',
          severity: 'warning',
        });
      }

      issues.push(...validateVoices(definition));

      const hasErrors = issues.some((issue) => issue.severity === 'error');

      return {
        valid: !hasErrors,
        issues,
      };
    },
  };
}
