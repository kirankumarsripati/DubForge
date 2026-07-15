import { randomUUID } from 'node:crypto';

import { CANONICAL_TRANSCRIPT_VERSION } from './constants.js';
import type { TranscriptSource } from './constants.js';

export interface CanonicalSegment {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly languageCode: string;
  readonly confidence: number | null;
  readonly speakerId: string | null;
}

export interface CanonicalTranscript {
  readonly version: typeof CANONICAL_TRANSCRIPT_VERSION;
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly segments: readonly CanonicalSegment[];
  readonly durationMs: number;
  readonly source: TranscriptSource;
  readonly createdAt: string;
}

export interface CreateCanonicalTranscriptInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly segments: readonly Omit<CanonicalSegment, 'id'>[];
  readonly durationMs: number;
  readonly source: TranscriptSource;
}

export function createCanonicalSegment(segment: Omit<CanonicalSegment, 'id'>): CanonicalSegment {
  return {
    id: randomUUID(),
    ...segment,
  };
}

export function createCanonicalTranscript(
  input: CreateCanonicalTranscriptInput,
): CanonicalTranscript {
  return {
    version: CANONICAL_TRANSCRIPT_VERSION,
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    languageCode: input.languageCode,
    segments: input.segments.map((segment) => createCanonicalSegment(segment)),
    durationMs: input.durationMs,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
}

export function serializeCanonicalTranscript(transcript: CanonicalTranscript): string {
  return JSON.stringify(transcript, null, 2);
}

export function deserializeCanonicalTranscript(content: string): CanonicalTranscript {
  const parsed = JSON.parse(content) as CanonicalTranscript;
  if (parsed.version !== CANONICAL_TRANSCRIPT_VERSION) {
    throw new Error(`Unsupported canonical transcript version "${parsed.version}".`);
  }

  return parsed;
}
