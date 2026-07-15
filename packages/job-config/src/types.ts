import type { OutputOptions, TranslationProfile, VideoMetadata } from '@dubforge/types';

export type VoiceGender = 'female' | 'male' | 'neutral';

export type VoiceQuality = 'standard' | 'high' | 'premium';

export type QualityLabel = 'Good' | 'Better' | 'Best';

export type ValidationSeverity = 'error' | 'warning';

export type ContainerFormat = 'mkv';

export interface Voice {
  readonly id: string;
  readonly label: string;
  readonly languageCode: string;
  readonly gender: VoiceGender;
  readonly provider: string;
  readonly quality: VoiceQuality;
}

export interface LanguageSelection {
  readonly code: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly isSource: boolean;
}

export type VoiceSelection = Readonly<Record<string, string>>;

export interface OutputConfiguration extends OutputOptions {
  readonly containerFormat: ContainerFormat;
}

export interface JobDefinition {
  readonly video: VideoMetadata | null;
  readonly languages: readonly LanguageSelection[];
  readonly voices: VoiceSelection;
  readonly profile: TranslationProfile;
  readonly output: OutputConfiguration;
  readonly outputDirectory: string;
}

export interface TranslationProfileDefinition {
  readonly id: TranslationProfile;
  readonly label: string;
  readonly description: string;
  readonly timeMultiplier: number;
  readonly qualityLabel: QualityLabel;
  readonly models: {
    readonly whisper: string;
    readonly translator: string;
    readonly speech: string;
  };
}

export interface JobEstimation {
  readonly processingTimeSeconds: number;
  readonly processingTimeLabel: string;
  readonly qualityLabel: QualityLabel;
  readonly outputSizeBytes: number | null;
  readonly artifacts: readonly string[];
  readonly languageTrackCount: number;
  readonly subtitleTrackCount: number;
}

export interface JobValidationIssue {
  readonly code: string;
  readonly field: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export interface JobValidationResult {
  readonly valid: boolean;
  readonly issues: readonly JobValidationIssue[];
}

export interface JobPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly languages: readonly LanguageSelection[];
  readonly voices: VoiceSelection;
  readonly profile: TranslationProfile;
  readonly output: OutputConfiguration;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SavePresetInput {
  readonly name: string;
  readonly description: string;
}

export interface EstimationService {
  estimate(definition: JobDefinition): JobEstimation;
}

export interface ValidationService {
  validate(definition: JobDefinition): JobValidationResult;
}

export interface PresetService {
  listPresets(): readonly JobPreset[];
  getPreset(id: string): JobPreset | null;
  savePreset(definition: JobDefinition, input: SavePresetInput): JobPreset;
  deletePreset(id: string): void;
  applyPreset(preset: JobPreset, definition: JobDefinition): JobDefinition;
}
