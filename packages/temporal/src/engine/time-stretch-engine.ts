import type { AlignmentSegmentPlan } from '../domain/alignment-plan.js';

export class TimeStretchEngine {
  resolveTargetDuration(plan: AlignmentSegmentPlan): number {
    return Math.round(plan.targetDurationMs / plan.stretchRatio);
  }
}

export function createTimeStretchEngine(): TimeStretchEngine {
  return new TimeStretchEngine();
}
