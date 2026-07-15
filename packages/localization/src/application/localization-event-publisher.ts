import { createDomainEventId, LOCALIZATION_EVENTS } from '@dubforge/platform-events';
import type { DomainEventBus } from '@dubforge/platform-events';

import type { LocalizedDocument } from '../domain/localized-document.js';
import type { LocalizationOperationRecord } from '../repository/localization-repository.js';

export function publishLocalizationOperationStarted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: LocalizationOperationRecord;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: LOCALIZATION_EVENTS.OPERATION_STARTED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    languageCode: input.operation.languageCode,
  });
}

export function publishLocalizationOperationCompleted(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: LocalizationOperationRecord;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: LOCALIZATION_EVENTS.OPERATION_COMPLETED,
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

export function publishLocalizationOperationFailed(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly operation: LocalizationOperationRecord;
  readonly message: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: LOCALIZATION_EVENTS.OPERATION_FAILED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    message: input.message,
    languageCode: input.operation.languageCode,
  });
}

export function publishLocalizedDocument(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly document: LocalizedDocument;
  readonly artifactPath: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: LOCALIZATION_EVENTS.DOCUMENT_LOCALIZED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    documentId: input.document.id,
    targetLanguageCode: input.document.targetLanguageCode,
    segmentCount: input.document.segments.length,
    artifactPath: input.artifactPath,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: LOCALIZATION_EVENTS.ARTIFACT_PRODUCED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: 'translate',
    languageCode: input.document.targetLanguageCode,
  });
}

export function publishLocalizationQualityAnalyzed(input: {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
  readonly score: number;
  readonly languageCode: string;
}): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    timestamp: new Date().toISOString(),
    type: LOCALIZATION_EVENTS.QUALITY_ANALYZED,
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    score: input.score,
    languageCode: input.languageCode,
  });
}
