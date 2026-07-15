import { describe, expect, it } from 'vitest';

import { applyGlossaryToText } from './glossary-engine.js';
import { analyzeLocalizationQuality } from './quality-engine.js';
import { createLocalizedDocument, createLocalizedSegment } from '../domain/localized-document.js';
import { TRANSLATION_SEGMENT_SOURCES } from '../domain/constants.js';

describe('Glossary engine', () => {
  it('replaces glossary terms in source text', () => {
    const result = applyGlossaryToText('Hello golden transcript.', [
      {
        id: 'glossary-1',
        sourceLanguageCode: 'en',
        targetLanguageCode: 'hi',
        sourceTerm: 'golden transcript',
        targetTerm: 'स्वर्णिम प्रतिलेख',
        caseSensitive: false,
      },
    ]);

    expect(result.applied).toBe(true);
    expect(result.text).toBe('Hello स्वर्णिम प्रतिलेख.');
  });
});

describe('Localization quality engine', () => {
  it('scores localized documents with preserved timing', () => {
    const document = createLocalizedDocument({
      workflowId: 'wf-1',
      jobId: 'job-1',
      sourceLanguageCode: 'en',
      targetLanguageCode: 'hi',
      sourceTranscriptId: 'source-1',
      durationMs: 5000,
      segments: [
        createLocalizedSegment({
          id: 'seg-1',
          startMs: 0,
          endMs: 2500,
          sourceText: 'Hello world.',
          text: 'नमस्ते दुनिया।',
          languageCode: 'hi',
          confidence: 0.9,
          speakerId: null,
          translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
        }),
      ],
    });

    const quality = analyzeLocalizationQuality(document);
    expect(quality.timingPreserved).toBe(true);
    expect(quality.score).toBeGreaterThan(0);
  });
});
