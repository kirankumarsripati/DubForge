export interface PerformanceSegment {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly pronunciationText: string;
  readonly audioPath: string;
  readonly audioDurationMs: number;
}

export function createPerformanceSegment(input: {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
  readonly pronunciationText: string;
  readonly audioPath: string;
  readonly audioDurationMs: number;
}): PerformanceSegment {
  return { ...input };
}
