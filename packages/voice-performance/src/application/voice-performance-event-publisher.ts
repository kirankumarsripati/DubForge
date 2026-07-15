import { createDomainEventId, VOICE_PERFORMANCE_EVENTS } from '@dubforge/platform-events';
import type { DomainEventBus } from '@dubforge/platform-events';

import type { VoicePerformance } from '../domain/voice-performance.js';
import type { VoicePerformanceOperationRecord } from '../repository/voice-performance-repository.js';

export function publishVoicePerformanceOperationStarted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: VoicePerformanceOperationRecord;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.OPERATION_STARTED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    languageCode: input.operation.languageCode,
  });
}

export function publishVoicePerformanceOperationCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: VoicePerformanceOperationRecord;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.OPERATION_COMPLETED,
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

export function publishVoicePerformanceOperationFailed(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: VoicePerformanceOperationRecord;
  readonly message: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.OPERATION_FAILED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    message: input.message,
    languageCode: input.operation.languageCode,
  });
}

export function publishVoicePerformanceSynthesized(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly performance: VoicePerformance;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.SYNTHESIZED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    performanceId: input.performance.id,
    languageCode: input.performance.languageCode,
    segmentCount: input.performance.segments.length,
    artifactPath: input.artifactPath,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.ARTIFACT_PRODUCED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: 'synthesize',
    languageCode: input.performance.languageCode,
  });
}

export function publishVoicePerformanceAligned(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly performance: VoicePerformance;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.ALIGNED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    performanceId: input.performance.id,
    languageCode: input.performance.languageCode,
    artifactPath: input.artifactPath,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: VOICE_PERFORMANCE_EVENTS.ARTIFACT_PRODUCED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: 'align',
    languageCode: input.performance.languageCode,
  });
}

export function publishSegmentArtifactRegistered(input: {
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
    type: VOICE_PERFORMANCE_EVENTS.SEGMENT_ARTIFACT_REGISTERED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    segmentId: input.segmentId,
    artifactPath: input.artifactPath,
    languageCode: input.languageCode,
  });
}
