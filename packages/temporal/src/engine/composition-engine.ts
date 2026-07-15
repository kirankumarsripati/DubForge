import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { createAudioComposition } from '../domain/audio-composition.js';
import { createAudioLayers } from '../domain/audio-layers.js';
import type { AlignmentPlan } from '../domain/alignment-plan.js';
import type { AudioAlignerPort } from '../ports/temporal-ports.js';
import { createAudioComposer } from './audio-composer.js';
import { createBackgroundSeparator } from './background-separator.js';
import { createLoudnessNormalizer } from './loudness-normalizer.js';
import { createTimeStretchEngine } from './time-stretch-engine.js';
import type { AudioComposerPort } from '../ports/temporal-ports.js';

async function writeAlignedPlaceholder(path: string, segmentId: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `ALIGNED_SEGMENT:${segmentId}`, 'utf8');
}

export class CompositionEngine {
  constructor(
    private readonly options: {
      readonly aligner: AudioAlignerPort;
      readonly composerPort: AudioComposerPort;
    },
  ) {}

  async compose(input: {
    readonly plan: AlignmentPlan;
    readonly stitchedSpeechPath: string;
    readonly artifactRoot: string;
    readonly nodeId: string;
    readonly onProgress: (progress: number) => void;
  }) {
    const timeStretchEngine = createTimeStretchEngine();
    const backgroundSeparator = createBackgroundSeparator();
    const loudnessNormalizer = createLoudnessNormalizer();
    const audioComposer = createAudioComposer(this.options.composerPort);

    input.onProgress(5);

    const alignedSegments = await Promise.all(
      input.plan.segments.map(async (segmentPlan, index) => {
        const aligned = await this.options.aligner.alignSegment({
          segmentId: segmentPlan.segmentId,
          sourceAudioPath: segmentPlan.sourceAudioPath,
          outputPath: segmentPlan.outputPath,
          stretchRatio: segmentPlan.stretchRatio,
          targetDurationMs: timeStretchEngine.resolveTargetDuration(segmentPlan),
        });

        input.onProgress(5 + Math.round(((index + 1) / input.plan.segments.length) * 55));
        return aligned;
      }),
    );

    const alignedSpeechPath = `${input.artifactRoot}/${input.nodeId}-${input.plan.languageCode}-aligned.wav`;
    await writeAlignedPlaceholder(alignedSpeechPath, input.plan.languageCode);

    const backgroundPath = `${input.artifactRoot}/${input.nodeId}-${input.plan.languageCode}-background.wav`;
    const separatedBackground = await backgroundSeparator.separate({
      sourceAudioPath: input.stitchedSpeechPath,
      outputPath: backgroundPath,
    });

    input.onProgress(70);

    const composedAudioPath = `${input.artifactRoot}/${input.nodeId}-${input.plan.languageCode}-composed.wav`;
    const composed = await audioComposer.compose({
      speechPath: alignedSpeechPath,
      backgroundPath: separatedBackground,
      outputPath: composedAudioPath,
      durationMs: input.plan.totalDurationMs,
    });

    loudnessNormalizer.normalize({ peakEstimate: 0.8 });
    input.onProgress(95);

    const layers = createAudioLayers({
      speech: alignedSpeechPath,
      background: separatedBackground,
      composed: composed.outputPath,
    });

    const composition = createAudioComposition({
      workflowId: input.plan.workflowId,
      jobId: input.plan.jobId,
      languageCode: input.plan.languageCode,
      alignmentPlanId: input.plan.id,
      layers,
      alignedSpeechPath,
      composedAudioPath: composed.outputPath,
      durationMs: input.plan.totalDurationMs,
    });

    input.onProgress(100);

    return {
      composition,
      alignedSegments,
      layerArtifacts: {
        speech: alignedSpeechPath,
        background: separatedBackground,
        composed: composed.outputPath,
      },
      segmentArtifacts: Object.fromEntries(
        alignedSegments.map((segment) => [
          `aligned-segment:${segment.segmentId}`,
          segment.outputPath,
        ]),
      ),
    };
  }
}

export function createCompositionEngine(input: {
  readonly aligner: AudioAlignerPort;
  readonly composerPort: AudioComposerPort;
}): CompositionEngine {
  return new CompositionEngine(input);
}
