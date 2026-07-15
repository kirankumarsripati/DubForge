import {
  createDomainEventId,
  TRANSCRIPTION_EVENTS,
  type DomainEventBus,
} from '@dubforge/platform-events';

import type { CanonicalTranscript } from '../domain/canonical-transcript.js';
import type { TranscriptionOperationRecord } from '../repository/localization-repository.js';

export interface PublishTranscriptionEventInput {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
}

export function publishTranscriptionRecognized(
  input: PublishTranscriptionEventInput & {
    readonly transcript: CanonicalTranscript;
    readonly artifactPath: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: TRANSCRIPTION_EVENTS.RECOGNIZED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    transcriptId: input.transcript.id,
    languageCode: input.transcript.languageCode,
    artifactPath: input.artifactPath,
    segmentCount: input.transcript.segments.length,
  });
}

export function publishTranscriptionOperationStarted(
  input: PublishTranscriptionEventInput & { readonly operation: TranscriptionOperationRecord },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: TRANSCRIPTION_EVENTS.OPERATION_STARTED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    languageCode: input.operation.languageCode,
  });
}

export function publishTranscriptionOperationCompleted(
  input: PublishTranscriptionEventInput & {
    readonly operation: TranscriptionOperationRecord;
    readonly artifactPath: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: TRANSCRIPTION_EVENTS.OPERATION_COMPLETED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    artifactPath: input.artifactPath,
    durationMs: input.operation.durationMs ?? 0,
    languageCode: input.operation.languageCode,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    type: TRANSCRIPTION_EVENTS.ARTIFACT_PRODUCED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: input.operation.kind,
    languageCode: input.operation.languageCode,
  });
}

export function publishTranscriptionOperationFailed(
  input: PublishTranscriptionEventInput & {
    readonly operation: TranscriptionOperationRecord;
    readonly message: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: TRANSCRIPTION_EVENTS.OPERATION_FAILED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    message: input.message,
    languageCode: input.operation.languageCode,
  });
}

export function publishTranscriptionQualityAnalyzed(
  input: PublishTranscriptionEventInput & { readonly score: number; readonly languageCode: string },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: TRANSCRIPTION_EVENTS.QUALITY_ANALYZED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    score: input.score,
    languageCode: input.languageCode,
  });
}
