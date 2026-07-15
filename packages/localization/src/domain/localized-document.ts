import { randomUUID } from 'node:crypto';

import { LOCALIZED_DOCUMENT_VERSION, TRANSLATION_SEGMENT_SOURCES } from './constants.js';
import type { TranslationSegmentSource } from './constants.js';

export interface LocalizedSegment {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly sourceText: string;
  readonly text: string;
  readonly languageCode: string;
  readonly confidence: number | null;
  readonly speakerId: string | null;
  readonly translationSource: TranslationSegmentSource;
}

export interface LocalizedDocument {
  readonly version: typeof LOCALIZED_DOCUMENT_VERSION;
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly sourceLanguageCode: string;
  readonly targetLanguageCode: string;
  readonly sourceTranscriptId: string;
  readonly segments: readonly LocalizedSegment[];
  readonly durationMs: number;
  readonly createdAt: string;
}

export interface CreateLocalizedDocumentInput {
  readonly workflowId: string;
  readonly jobId: string;
  readonly sourceLanguageCode: string;
  readonly targetLanguageCode: string;
  readonly sourceTranscriptId: string;
  readonly segments: readonly LocalizedSegment[];
  readonly durationMs: number;
}

export function createLocalizedSegment(
  segment: Omit<LocalizedSegment, 'translationSource'> & {
    readonly translationSource?: TranslationSegmentSource;
  },
): LocalizedSegment {
  return {
    ...segment,
    translationSource: segment.translationSource ?? TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
  };
}

export function createLocalizedDocument(input: CreateLocalizedDocumentInput): LocalizedDocument {
  return {
    version: LOCALIZED_DOCUMENT_VERSION,
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    sourceLanguageCode: input.sourceLanguageCode,
    targetLanguageCode: input.targetLanguageCode,
    sourceTranscriptId: input.sourceTranscriptId,
    segments: input.segments,
    durationMs: input.durationMs,
    createdAt: new Date().toISOString(),
  };
}

export function serializeLocalizedDocument(document: LocalizedDocument): string {
  return JSON.stringify(document, null, 2);
}

export function deserializeLocalizedDocument(content: string): LocalizedDocument {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const version = parsed.version;
  if (typeof version !== 'string' || version !== LOCALIZED_DOCUMENT_VERSION) {
    throw new Error(`Unsupported localized document version "${String(version)}".`);
  }

  return parsed as unknown as LocalizedDocument;
}
