import { describe, expect, it } from 'vitest';

import {
  createLocalizedDocument,
  createLocalizedSegment,
  TRANSLATION_SEGMENT_SOURCES,
} from '@dubforge/localization';

import { createPronunciationResolver } from './pronunciation-resolver.js';
import { createPerformancePlanner } from './performance-planner.js';

describe('Performance planner', () => {
  it('plans one synthesis job per localized segment', () => {
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
          sourceText: 'Hello',
          text: 'नमस्ते',
          languageCode: 'hi',
          confidence: 0.9,
          speakerId: null,
          translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
        }),
      ],
    });

    const plan = createPerformancePlanner().plan({
      document,
      voiceId: 'hi-female-1',
      voiceLabel: 'Ananya',
      artifactRoot: '/tmp/artifacts',
      nodeId: 'speech:hi',
      pronunciationResolver: createPronunciationResolver(),
    });

    expect(plan.segments).toHaveLength(1);
    expect(plan.segments[0]?.segmentId).toBe('seg-1');
    expect(plan.segments[0]?.startMs).toBe(0);
  });
});

describe('Pronunciation resolver', () => {
  it('applies pronunciation overrides', () => {
    const resolver = createPronunciationResolver([
      { term: 'DubForge', pronunciation: 'Dub Forge', languageCode: 'en' },
    ]);

    expect(resolver.resolve('Welcome to DubForge.', 'en')).toBe('Welcome to Dub Forge.');
  });
});
