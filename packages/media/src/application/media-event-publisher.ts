import { createDomainEventId, MEDIA_EVENTS, type DomainEventBus } from '@dubforge/platform-events';

import type { MediaFile, MediaOperation } from '../domain/entities/media-entities.js';

export interface PublishMediaEventInput {
  readonly eventBus: DomainEventBus;
  readonly workflowId: string;
  readonly jobId: string;
  readonly nodeId: string;
}

export function publishMediaFileProbed(
  input: PublishMediaEventInput & { readonly mediaFile: MediaFile; readonly artifactPath: string },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.FILE_PROBED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    mediaFileId: input.mediaFile.id,
    artifactPath: input.artifactPath,
    container: input.mediaFile.container.name,
    durationSeconds: input.mediaFile.duration.seconds,
    resolution: `${String(input.mediaFile.resolution.width)}x${String(input.mediaFile.resolution.height)}`,
    videoCodec: input.mediaFile.videoCodec.name,
  });
}

export function publishMediaFingerprintComputed(
  input: PublishMediaEventInput & {
    readonly contentHash: string;
    readonly artifactPath: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.FINGERPRINT_COMPUTED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    contentHash: input.contentHash,
    artifactPath: input.artifactPath,
  });
}

export function publishMediaThumbnailGenerated(
  input: PublishMediaEventInput & {
    readonly artifactPath: string;
    readonly thumbnailPath: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.THUMBNAIL_GENERATED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    thumbnailPath: input.thumbnailPath,
  });
}

export function publishMediaAudioExtracted(
  input: PublishMediaEventInput & {
    readonly artifactPath: string;
    readonly audioPath: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.AUDIO_EXTRACTED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    audioPath: input.audioPath,
  });
}

export function publishMediaImportCompleted(
  input: Omit<PublishMediaEventInput, 'nodeId'> & {
    readonly mediaFileId: string;
    readonly contentHash: string;
    readonly artifactPaths: Readonly<Record<string, string>>;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.IMPORT_COMPLETED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    mediaFileId: input.mediaFileId,
    contentHash: input.contentHash,
    artifactPaths: input.artifactPaths,
  });
}

export function publishMediaOperationStarted(
  input: PublishMediaEventInput & { readonly operation: MediaOperation },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.OPERATION_STARTED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
  });
}

export function publishMediaOperationCompleted(
  input: PublishMediaEventInput & {
    readonly operation: MediaOperation;
    readonly artifactPath: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.OPERATION_COMPLETED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    artifactPath: input.artifactPath,
    durationMs: input.operation.durationMs ?? 0,
  });

  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.ARTIFACT_PRODUCED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    artifactPath: input.artifactPath,
    operationKind: input.operation.kind,
  });
}

export function publishMediaOperationFailed(
  input: PublishMediaEventInput & { readonly operation: MediaOperation; readonly message: string },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.OPERATION_FAILED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    operationId: input.operation.id,
    operationKind: input.operation.kind,
    message: input.message,
  });
}

export function publishMediaDiagnostic(
  input: PublishMediaEventInput & {
    readonly level: 'info' | 'warn' | 'error';
    readonly message: string;
  },
): void {
  input.eventBus.publish({
    id: createDomainEventId(),
    type: MEDIA_EVENTS.DIAGNOSTIC_RECORDED,
    timestamp: new Date().toISOString(),
    workflowId: input.workflowId,
    jobId: input.jobId,
    nodeId: input.nodeId,
    level: input.level,
    message: input.message,
  });
}
