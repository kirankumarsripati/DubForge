import { createDomainEventId, TEMPORAL_EVENTS } from '@dubforge/platform-events';
import type { DomainEventBus } from '@dubforge/platform-events';

import type { AlignmentPlan } from '../domain/alignment-plan.js';
import type { AudioComposition } from '../domain/audio-composition.js';
import type { TemporalOperationRecord } from '../repository/temporal-repository.js';

export function publishTemporalOperationStarted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: TemporalOperationRecord;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.OPERATION_STARTED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    languageCode: input.operation.languageCode,
  });
}

export function publishTemporalOperationCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: TemporalOperationRecord;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.OPERATION_COMPLETED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    artifactPath: input.artifactPath,
    durationMs: input.operation.durationMs ?? 0,
    languageCode: input.operation.languageCode,
  });
}

export function publishTemporalOperationFailed(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: TemporalOperationRecord;
  readonly message: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.OPERATION_FAILED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    message: input.message,
    languageCode: input.operation.languageCode,
  });
}

export function publishAlignmentPlanCreated(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly plan: AlignmentPlan;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.ALIGNMENT_PLANNED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    planId: input.plan.id,
    languageCode: input.plan.languageCode,
    segmentCount: input.plan.segments.length,
    artifactPath: input.artifactPath,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.ARTIFACT_PRODUCED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: 'alignment-plan',
    languageCode: input.plan.languageCode,
  });
}

export function publishAudioCompositionCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly composition: AudioComposition;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.COMPOSED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    compositionId: input.composition.id,
    languageCode: input.composition.languageCode,
    artifactPath: input.artifactPath,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.ARTIFACT_PRODUCED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: 'compose',
    languageCode: input.composition.languageCode,
  });
}

export function publishAlignedSegmentArtifactRegistered(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly segmentId: string;
  readonly artifactPath: string;
  readonly languageCode: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: TEMPORAL_EVENTS.SEGMENT_ARTIFACT_REGISTERED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    segmentId: input.segmentId,
    artifactPath: input.artifactPath,
    languageCode: input.languageCode,
  });
}
