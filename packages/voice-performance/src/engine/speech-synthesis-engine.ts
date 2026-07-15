import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { createPerformanceSegment } from '../domain/performance-segment.js';
import { createVoicePerformance } from '../domain/voice-performance.js';
import type { SpeechSynthesizerPort } from '../ports/voice-performance-ports.js';
import { createAudioPostProcessor } from './audio-post-processor.js';
import { createAudioStitcher } from './audio-stitcher.js';
import type { PerformancePlanner } from './performance-planner.js';
import type { PerformancePlannerInput } from './performance-planner.js';

export class SpeechSynthesisEngine {
  constructor(
    private readonly options: {
      readonly planner: PerformancePlanner;
      readonly synthesizer: SpeechSynthesizerPort;
      readonly postProcessor: ReturnType<typeof createAudioPostProcessor>;
      readonly stitcher: ReturnType<typeof createAudioStitcher>;
    },
  ) {}

  async synthesize(
    input: PerformancePlannerInput & {
      readonly onProgress: (progress: number) => void;
      readonly stitchedOutputPath: string;
    },
  ) {
    const plan = this.options.planner.plan(input);
    input.onProgress(5);

    const synthesized = await Promise.all(
      plan.segments.map(async (planned, index) => {
        const result = await this.options.synthesizer.synthesizeSegment({
          segmentId: planned.segmentId,
          text: planned.pronunciationText,
          languageCode: plan.languageCode,
          voiceProfile: plan.voiceProfile,
          outputPath: planned.outputPath,
        });

        input.onProgress(5 + Math.round(((index + 1) / plan.segments.length) * 70));

        return createPerformanceSegment({
          id: planned.segmentId,
          startMs: planned.startMs,
          endMs: planned.endMs,
          text: planned.text,
          pronunciationText: planned.pronunciationText,
          audioPath: result.audioPath,
          audioDurationMs: result.durationMs,
        });
      }),
    );

    const processed = synthesized.map(
      (segment) => this.options.postProcessor.postProcess(segment).segment,
    );

    const stitchedAudioPath = await this.options.stitcher.stitch({
      segments: processed,
      totalDurationMs: plan.durationMs,
      outputPath: input.stitchedOutputPath,
    });

    input.onProgress(95);

    const performance = createVoicePerformance({
      workflowId: plan.workflowId,
      jobId: plan.jobId,
      localizedDocumentId: plan.localizedDocumentId,
      languageCode: plan.languageCode,
      voiceProfile: plan.voiceProfile,
      segments: processed,
      stitchedAudioPath,
      alignedAudioPath: null,
      durationMs: plan.durationMs,
    });

    input.onProgress(100);

    return {
      performance,
      segmentArtifacts: Object.fromEntries(
        processed.map((segment) => [`segment-audio:${segment.id}`, segment.audioPath]),
      ),
    };
  }
}

export async function writeSegmentPlaceholder(path: string, label: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `VOICE_SEGMENT:${label}`, 'utf8');
}

export function createSpeechSynthesisEngine(input: {
  readonly planner: PerformancePlanner;
  readonly synthesizer: SpeechSynthesizerPort;
}): SpeechSynthesisEngine {
  return new SpeechSynthesisEngine({
    planner: input.planner,
    synthesizer: input.synthesizer,
    postProcessor: createAudioPostProcessor(),
    stitcher: createAudioStitcher(),
  });
}
