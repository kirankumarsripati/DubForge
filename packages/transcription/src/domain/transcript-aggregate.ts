import type { CanonicalTranscript } from './canonical-transcript.js';
import type { RichText } from './rich-text.js';

export interface TranscriptQualityReport {
  readonly averageConfidence: number;
  readonly segmentCount: number;
  readonly emptySegmentCount: number;
  readonly overlapCount: number;
  readonly score: number;
}

export interface TranscriptAggregate {
  readonly transcript: CanonicalTranscript;
  readonly richText: RichText;
  readonly quality: TranscriptQualityReport;
  readonly normalizationVersion: string;
}

export function createTranscriptAggregate(input: {
  readonly transcript: CanonicalTranscript;
  readonly richText: RichText;
  readonly quality: TranscriptQualityReport;
  readonly normalizationVersion: string;
}): TranscriptAggregate {
  return {
    transcript: input.transcript,
    richText: input.richText,
    quality: input.quality,
    normalizationVersion: input.normalizationVersion,
  };
}
