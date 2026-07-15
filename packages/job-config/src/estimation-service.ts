import { TRANSLATION_PROFILES } from './constants';
import { getEnabledLanguages, getTargetLanguages } from './job-definition';
import type { EstimationService, JobDefinition, JobEstimation } from './types';

const BASE_PROCESSING_RATIO = 0.35;
const PER_TARGET_LANGUAGE_RATIO = 0.12;
const SPEECH_GENERATION_RATIO = 0.18;
const SUBTITLE_GENERATION_RATIO = 0.08;
const TRANSCRIPT_EXPORT_RATIO = 0.03;
const SRT_EXPORT_RATIO = 0.02;
const OUTPUT_SIZE_PER_LANGUAGE_RATIO = 0.08;

function formatDurationLabel(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `~${String(Math.max(1, Math.round(totalSeconds)))} sec`;
  }

  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `~${String(totalMinutes)} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `~${String(hours)} hr`;
  }

  return `~${String(hours)} hr ${String(minutes)} min`;
}

function buildArtifacts(definition: JobDefinition): readonly string[] {
  const artifacts: string[] = [`${definition.output.containerFormat.toUpperCase()} container`];
  const enabledLanguages = getEnabledLanguages(definition.languages);
  const targetLanguages = getTargetLanguages(definition.languages);

  if (definition.output.generateTranslatedAudio) {
    artifacts.push(
      `${String(enabledLanguages.length)} audio track${enabledLanguages.length === 1 ? '' : 's'}`,
    );
  }

  if (definition.output.generateSubtitles) {
    artifacts.push(
      `${String(enabledLanguages.length)} subtitle track${enabledLanguages.length === 1 ? '' : 's'}`,
    );
  }

  if (definition.output.exportSrt) {
    artifacts.push(
      `${String(enabledLanguages.length)} SRT file${enabledLanguages.length === 1 ? '' : 's'}`,
    );
  }

  if (definition.output.exportTranscript) {
    artifacts.push('Transcript export');
  }

  if (targetLanguages.length > 0 && definition.output.generateTranslatedAudio) {
    artifacts.push(
      `${String(targetLanguages.length)} dubbed language${targetLanguages.length === 1 ? '' : 's'}`,
    );
  }

  return artifacts;
}

export function createEstimationService(): EstimationService {
  return {
    estimate(definition: JobDefinition): JobEstimation {
      const profile = TRANSLATION_PROFILES[definition.profile];
      const enabledLanguages = getEnabledLanguages(definition.languages);
      const targetLanguages = getTargetLanguages(definition.languages);
      const durationSeconds = definition.video?.durationSeconds ?? 0;

      let processingTimeSeconds = 0;

      if (durationSeconds > 0) {
        processingTimeSeconds += durationSeconds * BASE_PROCESSING_RATIO * profile.timeMultiplier;
        processingTimeSeconds +=
          durationSeconds *
          PER_TARGET_LANGUAGE_RATIO *
          targetLanguages.length *
          profile.timeMultiplier;

        if (definition.output.generateTranslatedAudio) {
          processingTimeSeconds +=
            durationSeconds *
            SPEECH_GENERATION_RATIO *
            targetLanguages.length *
            profile.timeMultiplier;
        }

        if (definition.output.generateSubtitles) {
          processingTimeSeconds +=
            durationSeconds * SUBTITLE_GENERATION_RATIO * profile.timeMultiplier;
        }

        if (definition.output.exportTranscript) {
          processingTimeSeconds += durationSeconds * TRANSCRIPT_EXPORT_RATIO;
        }

        if (definition.output.exportSrt) {
          processingTimeSeconds += durationSeconds * SRT_EXPORT_RATIO * enabledLanguages.length;
        }
      }

      const roundedSeconds = Math.max(30, Math.round(processingTimeSeconds));
      const outputSizeBytes =
        definition.video === null
          ? null
          : Math.round(
              definition.video.fileSizeBytes *
                (1 + enabledLanguages.length * OUTPUT_SIZE_PER_LANGUAGE_RATIO),
            );

      const subtitleTrackCount = definition.output.generateSubtitles ? enabledLanguages.length : 0;

      return {
        processingTimeSeconds: roundedSeconds,
        processingTimeLabel: formatDurationLabel(roundedSeconds),
        qualityLabel: profile.qualityLabel,
        outputSizeBytes,
        artifacts: buildArtifacts(definition),
        languageTrackCount: definition.output.generateTranslatedAudio ? enabledLanguages.length : 0,
        subtitleTrackCount,
      };
    },
  };
}
