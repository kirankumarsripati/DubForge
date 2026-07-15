import { randomUUID } from 'node:crypto';

import type { PackagingPlanStatus } from './constants.js';
import { PACKAGING_PLAN_STATUSES } from './constants.js';
import type { Deliverable } from './deliverable.js';

export interface PackagingPlan {
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly exportProfileId: string;
  readonly outputDirectory: string;
  readonly status: PackagingPlanStatus;
  readonly deliverables: readonly Deliverable[];
  readonly previewArtifactPath: string | null;
  readonly createdAt: string;
}

export function createPackagingPlan(input: {
  readonly workflowId: string;
  readonly jobId: string;
  readonly exportProfileId: string;
  readonly outputDirectory: string;
  readonly deliverables: readonly Deliverable[];
  readonly status?: PackagingPlanStatus;
  readonly previewArtifactPath?: string | null;
}): PackagingPlan {
  return {
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    exportProfileId: input.exportProfileId,
    outputDirectory: input.outputDirectory,
    status: input.status ?? PACKAGING_PLAN_STATUSES.DRAFT,
    deliverables: input.deliverables,
    previewArtifactPath: input.previewArtifactPath ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function serializePackagingPlan(plan: PackagingPlan): string {
  return JSON.stringify(plan, null, 2);
}

export function deserializePackagingPlan(content: string): PackagingPlan {
  return JSON.parse(content) as PackagingPlan;
}
