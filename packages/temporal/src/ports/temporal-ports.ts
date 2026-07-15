import type { LocalizedDocument } from '@dubforge/localization';
import type { VoicePerformance } from '@dubforge/voice-performance';

export interface LocalizedDocumentReader {
  getLocalizedDocument(workflowId: string, languageCode: string): LocalizedDocument | null;
}

export interface VoicePerformanceReader {
  getVoicePerformance(workflowId: string, languageCode: string): VoicePerformance | null;
}

export interface AlignSegmentInput {
  readonly segmentId: string;
  readonly sourceAudioPath: string;
  readonly outputPath: string;
  readonly stretchRatio: number;
  readonly targetDurationMs: number;
}

export interface AlignedSegmentAudio {
  readonly segmentId: string;
  readonly outputPath: string;
  readonly durationMs: number;
}

export interface AudioAlignerPort {
  alignSegment(input: AlignSegmentInput): Promise<AlignedSegmentAudio>;
}

export interface ComposeLayersInput {
  readonly speechPath: string;
  readonly backgroundPath: string | null;
  readonly outputPath: string;
  readonly durationMs: number;
}

export interface ComposedAudioResult {
  readonly outputPath: string;
  readonly durationMs: number;
}

export interface AudioComposerPort {
  composeLayers(input: ComposeLayersInput): Promise<ComposedAudioResult>;
}
