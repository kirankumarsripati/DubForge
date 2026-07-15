import { describe, expect, it } from 'vitest';

import { createCanonicalTranscript } from '../domain/canonical-transcript.js';
import { TRANSCRIPT_SOURCES } from '../domain/constants.js';
import { mergeAdjacentSegments } from './segment-merger.js';
import { splitLongSegments } from './segment-splitter.js';
import { normalizeCanonicalTranscript } from './normalization.js';
import { analyzeTranscriptQuality } from './quality-analyzer.js';
import { buildSrtCaptions } from './caption-builder.js';
import { createTranscriptProcessingPlatform } from './transcript-processing-platform.js';

describe('Transcript processing platform', () => {
  it('normalizes, merges, splits, and analyzes transcripts', () => {
    const transcript = createCanonicalTranscript({
      workflowId: 'wf-1',
      jobId: 'job-1',
      languageCode: 'en',
      durationMs: 8000,
      source: TRANSCRIPT_SOURCES.SPEECH_RECOGNITION,
      segments: [
        {
          startMs: 0,
          endMs: 2000,
          text: 'Hello   world.',
          languageCode: 'en',
          confidence: 0.9,
          speakerId: null,
        },
        {
          startMs: 2100,
          endMs: 4000,
          text: 'Second segment.',
          languageCode: 'en',
          confidence: 0.85,
          speakerId: null,
        },
        {
          startMs: 4000,
          endMs: 11000,
          text: 'This is a very long segment that should be split for captions.',
          languageCode: 'en',
          confidence: 0.8,
          speakerId: null,
        },
      ],
    });

    const merged = mergeAdjacentSegments(normalizeCanonicalTranscript(transcript).segments);
    expect(merged).toHaveLength(2);

    const split = splitLongSegments(merged, 3000);
    expect(split.length).toBeGreaterThan(2);

    const aggregate = createTranscriptProcessingPlatform().process({
      ...transcript,
      segments: split,
    });

    expect(aggregate.quality.score).toBeGreaterThan(0);
    expect(buildSrtCaptions(aggregate.transcript)).toContain('Hello world.');
  });
});
