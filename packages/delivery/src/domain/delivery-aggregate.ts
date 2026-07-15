import { randomUUID } from 'node:crypto';

import { DELIVERY_VERSION } from './constants.js';
import type { Deliverable } from './deliverable.js';
import type { PackagingPlan } from './packaging-plan.js';
import type { ValidationReport } from './validation-report.js';

export interface DeliveryAggregate {
  readonly version: typeof DELIVERY_VERSION;
  readonly id: string;
  readonly workflowId: string;
  readonly jobId: string;
  readonly packagingPlanId: string;
  readonly exportProfileId: string;
  readonly deliverables: readonly Deliverable[];
  readonly validationReports: readonly ValidationReport[];
  readonly projectBundlePath: string | null;
  readonly exportTimeMs: number;
  readonly exportSizeBytes: number;
  readonly validationScore: number;
  readonly warningCount: number;
  readonly createdAt: string;
}

export function createDeliveryAggregate(input: {
  readonly workflowId: string;
  readonly jobId: string;
  readonly plan: PackagingPlan;
  readonly deliverables: readonly Deliverable[];
  readonly validationReports: readonly ValidationReport[];
  readonly projectBundlePath: string | null;
  readonly exportTimeMs: number;
  readonly exportSizeBytes: number;
  readonly validationScore: number;
  readonly warningCount: number;
}): DeliveryAggregate {
  return {
    version: DELIVERY_VERSION,
    id: randomUUID(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    packagingPlanId: input.plan.id,
    exportProfileId: input.plan.exportProfileId,
    deliverables: input.deliverables,
    validationReports: input.validationReports,
    projectBundlePath: input.projectBundlePath,
    exportTimeMs: input.exportTimeMs,
    exportSizeBytes: input.exportSizeBytes,
    validationScore: input.validationScore,
    warningCount: input.warningCount,
    createdAt: new Date().toISOString(),
  };
}

export function serializeDeliveryAggregate(aggregate: DeliveryAggregate): string {
  return JSON.stringify(aggregate, null, 2);
}

export function deserializeDeliveryAggregate(content: string): DeliveryAggregate {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const version = parsed.version;
  if (typeof version !== 'string' || version !== DELIVERY_VERSION) {
    throw new Error(`Unsupported delivery aggregate version "${String(version)}".`);
  }
  return parsed as unknown as DeliveryAggregate;
}
