import { describe, expect, it } from 'vitest';

import { createAlignmentPlan } from '../domain/alignment-plan.js';
import { RubberBandAdapter } from '../adapters/rubber-band-adapter.js';
import { FfmpegCompositionAdapter } from '../adapters/ffmpeg-composition-adapter.js';
import { createCompositionEngine } from './composition-engine.js';

describe('CompositionEngine', () => {
  it('aligns segments in parallel and composes audio layers', async () => {
    const engine = createCompositionEngine({
      aligner: new RubberBandAdapter(),
      composerPort: new FfmpegCompositionAdapter(),
    });

    const plan = createAlignmentPlan({
      workflowId: 'wf-compose',
      jobId: 'job-compose',
      languageCode: 'hi',
      voicePerformanceId: 'perf-1',
      totalDurationMs: 5000,
      segments: [
        {
          segmentId: 'seg-hello',
          startMs: 0,
          endMs: 2500,
          sourceAudioPath: '/tmp/seg-hello.wav',
          targetDurationMs: 2500,
          stretchRatio: 1.1,
          outputPath: '/tmp/artifacts/align-hi-seg-hello-aligned.wav',
        },
        {
          segmentId: 'seg-golden',
          startMs: 2500,
          endMs: 5000,
          sourceAudioPath: '/tmp/seg-golden.wav',
          targetDurationMs: 2500,
          stretchRatio: 0.9,
          outputPath: '/tmp/artifacts/align-hi-seg-golden-aligned.wav',
        },
      ],
    });

    const result = await engine.compose({
      plan,
      stitchedSpeechPath: '/tmp/artifacts/speech-hi.wav',
      artifactRoot: '/tmp/artifacts',
      nodeId: 'align:hi',
      onProgress: () => undefined,
    });

    expect(result.alignedSegments).toHaveLength(2);
    expect(result.composition.languageCode).toBe('hi');
    expect(result.composition.layers.speech).toContain('aligned.wav');
    expect(result.composition.layers.composed).toContain('composed.wav');
    expect(result.segmentArtifacts['aligned-segment:seg-hello']).toBeDefined();
  });
});
