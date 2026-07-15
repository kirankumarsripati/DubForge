import { describe, expect, it } from 'vitest';

import {
  createLocalizedDocument,
  createLocalizedSegment,
  TRANSLATION_SEGMENT_SOURCES,
} from '@dubforge/localization';
import { createPerformanceSegment } from '@dubforge/voice-performance';

import { createAlignmentEngine } from './alignment-engine.js';

describe('AlignmentEngine', () => {
  it('builds a plan that preserves transcript segment timing', () => {
    const engine = createAlignmentEngine();
    const document = createLocalizedDocument({
      workflowId: 'wf-align',
      jobId: 'job-align',
      sourceLanguageCode: 'en',
      targetLanguageCode: 'hi',
      sourceTranscriptId: 'transcript-1',
      durationMs: 5000,
      segments: [
        createLocalizedSegment({
          id: 'seg-hello',
          startMs: 0,
          endMs: 2500,
          sourceText: 'Hello.',
          text: 'नमस्ते।',
          languageCode: 'hi',
          confidence: 0.9,
          speakerId: null,
          translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
        }),
        createLocalizedSegment({
          id: 'seg-golden',
          startMs: 2500,
          endMs: 5000,
          sourceText: 'Golden.',
          text: 'स्वर्णिम।',
          languageCode: 'hi',
          confidence: 0.9,
          speakerId: null,
          translationSource: TRANSLATION_SEGMENT_SOURCES.TRANSLATOR,
        }),
      ],
    });

    const plan = engine.buildPlan({
      workflowId: 'wf-align',
      jobId: 'job-align',
      languageCode: 'hi',
      voicePerformanceId: 'perf-1',
      document,
      performanceSegments: [
        createPerformanceSegment({
          id: 'seg-hello',
          startMs: 0,
          endMs: 2500,
          text: 'नमस्ते।',
          pronunciationText: 'नमस्ते।',
          audioPath: '/tmp/seg-hello.wav',
          audioDurationMs: 2000,
        }),
        createPerformanceSegment({
          id: 'seg-golden',
          startMs: 2500,
          endMs: 5000,
          text: 'स्वर्णिम।',
          pronunciationText: 'स्वर्णिम।',
          audioPath: '/tmp/seg-golden.wav',
          audioDurationMs: 3000,
        }),
      ],
      artifactRoot: '/tmp/artifacts',
      nodeId: 'align:hi',
    });

    expect(plan.segments[0]?.startMs).toBe(0);
    expect(plan.segments[0]?.endMs).toBe(2500);
    expect(plan.segments[0]?.targetDurationMs).toBe(2500);
    expect(plan.segments[0]?.stretchRatio).toBeGreaterThanOrEqual(0.5);
    expect(plan.segments[0]?.stretchRatio).toBeLessThanOrEqual(2);
    expect(plan.totalDurationMs).toBe(5000);
  });
});
