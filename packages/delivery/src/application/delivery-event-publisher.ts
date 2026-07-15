import { createDomainEventId, DELIVERY_EVENTS } from '@dubforge/platform-events';
import type { DomainEventBus } from '@dubforge/platform-events';

import type { DeliveryAggregate } from '../domain/delivery-aggregate.js';
import type { PackagingPlan } from '../domain/packaging-plan.js';
import type { ValidationReport } from '../domain/validation-report.js';
import type { DeliveryOperationRecord } from '../persistence/delivery-repository.js';
import type { DeliveryMetrics } from '../engine/report-generator.js';

export function publishDeliveryOperationStarted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: DeliveryOperationRecord;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.OPERATION_STARTED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
  });
}

export function publishDeliveryOperationCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: DeliveryOperationRecord;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.OPERATION_COMPLETED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    artifactPath: input.artifactPath,
    durationMs: input.operation.durationMs ?? 0,
  });
}

export function publishDeliveryOperationFailed(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: DeliveryOperationRecord;
  readonly message: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.OPERATION_FAILED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    message: input.message,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.EXPORT_FAILED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    message: input.message,
  });
}

export function publishPackagingStarted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly plan: PackagingPlan;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.PACKAGING_STARTED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    planId: input.plan.id,
    deliverableCount: input.plan.deliverables.length,
    exportProfileId: input.plan.exportProfileId,
  });
}

export function publishPackagingCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly aggregate: DeliveryAggregate;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.PACKAGING_COMPLETED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    deliveryId: input.aggregate.id,
    deliverableCount: input.aggregate.deliverables.length,
    artifactPath: input.aggregate.deliverables[0]?.outputPath ?? '',
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.ARTIFACT_PRODUCED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.aggregate.deliverables[0]?.outputPath ?? '',
    operationKind: 'package',
  });
}

export function publishValidationCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly report: ValidationReport;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.VALIDATION_COMPLETED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    deliverableId: input.report.deliverableId,
    score: input.report.score,
    playable: input.report.playable,
  });
}

export function publishProjectArchived(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly bundlePath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.PROJECT_ARCHIVED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    bundlePath: input.bundlePath,
  });
}

export function publishDeliveryMetrics(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly metrics: DeliveryMetrics;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: DELIVERY_EVENTS.METRIC_RECORDED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    exportTimeMs: input.metrics.exportTimeMs,
    exportSizeBytes: input.metrics.exportSizeBytes,
    validationScore: input.metrics.validationScore,
    warningCount: input.metrics.warningCount,
  });
}
