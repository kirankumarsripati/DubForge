import type { PerformanceSegment } from '@dubforge/voice-performance';
import type { LocalizedDocument } from '@dubforge/localization';

import { createAlignmentPlan, type AlignmentSegmentPlan } from '../domain/alignment-plan.js';

const MIN_STRETCH_RATIO = 0.5;
const MAX_STRETCH_RATIO = 2.0;

export class AlignmentEngine {
  buildPlan(input: {
    readonly workflowId: string;
    readonly jobId: string;
    readonly languageCode: string;
    readonly voicePerformanceId: string;
    readonly document: LocalizedDocument;
    readonly performanceSegments: readonly PerformanceSegment[];
    readonly artifactRoot: string;
    readonly nodeId: string;
  }) {
    const segmentById = new Map(input.performanceSegments.map((segment) => [segment.id, segment]));

    const segments: AlignmentSegmentPlan[] = input.document.segments.map((segment) => {
      const performanceSegment = segmentById.get(segment.id);
      if (performanceSegment === undefined) {
        throw new Error(`Voice performance segment "${segment.id}" was not found.`);
      }

      const targetDurationMs = Math.max(1, segment.endMs - segment.startMs);
      const sourceDurationMs = Math.max(1, performanceSegment.audioDurationMs);
      const stretchRatio = Math.min(
        MAX_STRETCH_RATIO,
        Math.max(MIN_STRETCH_RATIO, targetDurationMs / sourceDurationMs),
      );

      return {
        segmentId: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        sourceAudioPath: performanceSegment.audioPath,
        targetDurationMs,
        stretchRatio,
        outputPath: `${input.artifactRoot}/${input.nodeId}-${segment.id}-aligned.wav`,
      };
    });

    return createAlignmentPlan({
      workflowId: input.workflowId,
      jobId: input.jobId,
      languageCode: input.languageCode,
      voicePerformanceId: input.voicePerformanceId,
      totalDurationMs: input.document.durationMs,
      segments,
    });
  }
}

export function createAlignmentEngine(): AlignmentEngine {
  return new AlignmentEngine();
}
