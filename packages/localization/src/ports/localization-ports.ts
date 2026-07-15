import type { CanonicalTranscript } from '@dubforge/transcription';

export interface CanonicalTranscriptReader {
  getCanonicalTranscript(workflowId: string, languageCode: string): CanonicalTranscript | null;
}

export interface TranslatorSegmentInput {
  readonly segmentId: string;
  readonly text: string;
}

export interface TranslatorSegmentOutput {
  readonly segmentId: string;
  readonly text: string;
}

export interface TranslateSegmentsInput {
  readonly sourceLanguageCode: string;
  readonly targetLanguageCode: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly segments: readonly TranslatorSegmentInput[];
  readonly onProgress: (progress: number) => void;
}

export interface TranslatorPort {
  translateSegments(input: TranslateSegmentsInput): Promise<readonly TranslatorSegmentOutput[]>;
}

export interface GlossaryEntry {
  readonly id: string;
  readonly sourceLanguageCode: string;
  readonly targetLanguageCode: string;
  readonly sourceTerm: string;
  readonly targetTerm: string;
  readonly caseSensitive: boolean;
}

export interface TranslationMemoryEntry {
  readonly id: string;
  readonly sourceLanguageCode: string;
  readonly targetLanguageCode: string;
  readonly sourceText: string;
  readonly targetText: string;
  readonly createdAt: string;
  readonly lastUsedAt: string;
}
