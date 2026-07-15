import {
  createLocalizedDocument,
  createLocalizedSegment,
  TRANSLATION_SEGMENT_SOURCES,
} from '@dubforge/localization';
import type { LocalizationRepository } from '@dubforge/localization';

export function seedLocalizedDocument(input: {
  readonly repository: LocalizationRepository;
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode?: string;
  readonly segments?: readonly {
    readonly id: string;
    readonly startMs: number;
    readonly endMs: number;
    readonly sourceText: string;
    readonly text: string;
  }[];
}) {
  const languageCode = input.languageCode ?? 'hi';
  const defaultSegments = [
    {
      id: 'seg-hello',
      startMs: 0,
      endMs: 2500,
      sourceText: 'Hello world.',
      text: 'नमस्ते दुनिया।',
    },
    {
      id: 'seg-golden',
      startMs: 2500,
      endMs: 5000,
      sourceText: 'This is a golden transcript.',
      text: 'यह एक स्वर्णिम प्रतिलेख है।',
    },
  ];

  const segments = input.segments ?? defaultSegments;
  const document = createLocalizedDocument({
    workflowId: input.workflowId,
    jobId: input.jobId,
    sourceLanguageCode: 'en',
    targetLanguageCode: languageCode,
    sourceTranscriptId: 'golden-source-transcript',
    durationMs: 5000,
    segments: segments.map((segment) =>
      createLocalizedSegment({
        id: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        sourceText: segment.sourceText,
        text: segment.text,
        languageCode,
        confidence: 0.9,
        speakerId: null,
        translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
      }),
    ),
  });

  input.repository.saveLocalizedDocument(document, 90);
  return document;
}
