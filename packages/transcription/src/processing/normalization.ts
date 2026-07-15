import type { CanonicalSegment, CanonicalTranscript } from '../domain/canonical-transcript.js';
import { createCanonicalTranscript } from '../domain/canonical-transcript.js';
import { TRANSCRIPT_SOURCES } from '../domain/constants.js';

export const NORMALIZATION_VERSION = '1.0.0' as const;

export function normalizeSegmentText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function normalizeCanonicalSegments(
  segments: readonly CanonicalSegment[],
): readonly CanonicalSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      text: normalizeSegmentText(segment.text),
    }))
    .filter((segment) => segment.text.length > 0)
    .sort((left, right) => left.startMs - right.startMs);
}

export function normalizeCanonicalTranscript(transcript: CanonicalTranscript): CanonicalTranscript {
  return {
    ...transcript,
    segments: normalizeCanonicalSegments(transcript.segments),
  };
}

export function buildCanonicalTranscriptFromSeconds(input: {
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly durationMs: number;
  readonly segments: readonly {
    readonly start: number;
    readonly end: number;
    readonly text: string;
    readonly confidence: number | null;
    readonly speakerId?: string | null;
  }[];
}): CanonicalTranscript {
  const transcript = createCanonicalTranscript({
    workflowId: input.workflowId,
    jobId: input.jobId,
    languageCode: input.languageCode,
    durationMs: input.durationMs,
    source: TRANSCRIPT_SOURCES.SPEECH_RECOGNITION,
    segments: input.segments.map((segment) => ({
      startMs: Math.round(segment.start * 1000),
      endMs: Math.round(segment.end * 1000),
      text: normalizeSegmentText(segment.text),
      languageCode: input.languageCode,
      confidence: segment.confidence,
      speakerId: segment.speakerId ?? null,
    })),
  });

  return normalizeCanonicalTranscript(transcript);
}
