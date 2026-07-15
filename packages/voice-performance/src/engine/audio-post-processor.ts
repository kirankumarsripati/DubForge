import type { PerformanceSegment } from '../domain/performance-segment.js';

const TARGET_PEAK = 0.9;

export interface PostProcessedSegment {
  readonly segment: PerformanceSegment;
  readonly normalizedPeak: number;
}

export class AudioPostProcessor {
  postProcess(segment: PerformanceSegment): PostProcessedSegment {
    const durationMs = Math.max(1, segment.audioDurationMs);
    const normalizedPeak = Math.min(
      TARGET_PEAK,
      durationMs / (segment.endMs - segment.startMs + 1),
    );

    return {
      segment,
      normalizedPeak,
    };
  }

  alignSegments(
    segments: readonly PerformanceSegment[],
    totalDurationMs: number,
  ): readonly PerformanceSegment[] {
    return segments
      .map((segment) => {
        const slotDurationMs = Math.max(1, segment.endMs - segment.startMs);
        const audioDurationMs = Math.min(segment.audioDurationMs, slotDurationMs);

        return {
          ...segment,
          audioDurationMs,
        };
      })
      .filter((segment) => segment.startMs <= totalDurationMs);
  }
}

export function createAudioPostProcessor(): AudioPostProcessor {
  return new AudioPostProcessor();
}
