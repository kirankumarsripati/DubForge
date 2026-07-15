import { randomUUID } from 'node:crypto';

import {
  CANONICAL_TRANSCRIPT_VERSION,
  TRANSCRIPT_SOURCES,
  type CanonicalTranscript,
} from '@dubforge/transcription';

import type { LocalizedDocument } from '../domain/localized-document.js';

export function localizedDocumentToCanonicalTranscript(
  document: LocalizedDocument,
): CanonicalTranscript {
  return {
    version: CANONICAL_TRANSCRIPT_VERSION,
    id: randomUUID(),
    workflowId: document.workflowId,
    jobId: document.jobId,
    languageCode: document.targetLanguageCode,
    durationMs: document.durationMs,
    source: TRANSCRIPT_SOURCES.TRANSLATION,
    createdAt: document.createdAt,
    segments: document.segments.map((segment) => ({
      id: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
      languageCode: segment.languageCode,
      confidence: segment.confidence,
      speakerId: segment.speakerId,
    })),
  };
}
