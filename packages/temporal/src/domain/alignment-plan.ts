import { randomUUID } from 'node:crypto';

export interface AlignmentSegmentPlan {
  readonly segmentId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly sourceAudioPath: string;
  readonly targetDurationMs: number;
  readonly stretchRatio: number;
  readonly outputPath: string;
}

export interface AlignmentPlan {
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly voicePerformanceId: string;
  readonly totalDurationMs: number;
  readonly segments: readonly AlignmentSegmentPlan[];
  readonly createdAt: string;
}

export function createAlignmentPlan(input: {
  readonly workflowId: string;
  readonly jobId: string;
  readonly languageCode: string;
  readonly voicePerformanceId: string;
  readonly totalDurationMs: number;
  readonly segments: readonly AlignmentSegmentPlan[];
}): AlignmentPlan {
  return {
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    languageCode: input.languageCode,
    voicePerformanceId: input.voicePerformanceId,
    totalDurationMs: input.totalDurationMs,
    segments: input.segments,
    createdAt: new Date().toISOString(),
  };
}

export function serializeAlignmentPlan(plan: AlignmentPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function deserializeAlignmentPlan(content: string): AlignmentPlan {
  const parsed = JSON.parse(content) as AlignmentPlan;
  return parsed;
}
