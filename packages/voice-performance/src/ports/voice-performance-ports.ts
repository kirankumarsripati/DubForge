import type { LocalizedDocument } from '@dubforge/localization';

import type { VoiceProfile } from '../domain/voice-profile.js';

export interface LocalizedDocumentReader {
  getLocalizedDocument(workflowId: string, languageCode: string): LocalizedDocument | null;
}

export interface PronunciationEntry {
  readonly term: string;
  readonly pronunciation: string;
  readonly languageCode: string;
}

export interface SynthesizeSegmentInput {
  readonly segmentId: string;
  readonly text: string;
  readonly languageCode: string;
  readonly voiceProfile: VoiceProfile;
  readonly outputPath: string;
}

export interface SynthesizedSegmentAudio {
  readonly segmentId: string;
  readonly audioPath: string;
  readonly durationMs: number;
}

export interface SpeechSynthesizerPort {
  synthesizeSegment(input: SynthesizeSegmentInput): Promise<SynthesizedSegmentAudio>;
}

export interface PlannedSegment {
  readonly segmentId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly pronunciationText: string;
  readonly outputPath: string;
}

export interface PerformancePlan {
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly voiceProfile: VoiceProfile;
  readonly localizedDocumentId: string;
  readonly durationMs: number;
  readonly segments: readonly PlannedSegment[];
}
