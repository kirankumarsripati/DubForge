import { access } from 'node:fs/promises';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import {
  validateVideoExtension,
  validateVideoFileStats,
  type VideoValidationFailure,
} from '@dubforge/shared';
import { NODE_KINDS } from '@dubforge/types';

import { MEDIA_ARTIFACT_FILENAMES } from '../domain/artifact-names.js';
import { MEDIA_OPERATION_KINDS } from '../domain/constants.js';
import type { MediaRepository } from '../repository/media-repository.js';
import {
  publishMediaDiagnostic,
  publishMediaOperationCompleted,
  publishMediaOperationFailed,
  publishMediaOperationStarted,
} from './media-event-publisher.js';

export interface ValidateMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly artifactSink?: ArtifactSink;
}

export class ValidateMediaService {
  constructor(private readonly options: ValidateMediaServiceOptions) {}

  async validateForWorkflow(input: {
    readonly filePath: string;
    readonly filename: string;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly fileSizeBytes: number;
    readonly fileModifiedAtMs: number;
    readonly artifactSink?: ArtifactSink;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const startedAt = Date.now();
    const operation = this.options.repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.VALIDATE,
      mediaFileId: null,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
    });

    publishMediaOperationStarted({
      eventBus: this.options.eventBus,
      workflowId: input.workflowId,
      jobId: input.jobId,
      nodeId: input.nodeId,
      operation,
    });

    try {
      await access(input.filePath);

      const statsFailure = validateVideoFileStats({
        filePath: input.filePath,
        filename: input.filename,
        fileSizeBytes: input.fileSizeBytes,
        fileModifiedAtMs: input.fileModifiedAtMs,
      });
      if (statsFailure !== null) {
        throw new ValidationStageError(statsFailure);
      }

      const extensionFailure = validateVideoExtension(input.filename);
      if (extensionFailure !== null) {
        throw new ValidationStageError(extensionFailure);
      }

      const artifactPath = `${input.artifactRoot}/${MEDIA_ARTIFACT_FILENAMES.VALIDATE}`;
      const durationMs = Date.now() - startedAt;
      const artifactContent = JSON.stringify(
        {
          adapter: 'validate-input',
          filePath: input.filePath,
          filename: input.filename,
          fileSizeBytes: input.fileSizeBytes,
          fileModifiedAtMs: input.fileModifiedAtMs,
          validatedAt: new Date().toISOString(),
          durationMs,
        },
        null,
        2,
      );

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(artifactPath, artifactContent);
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        artifactPath,
        durationMs,
      );

      publishMediaOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath,
      });

      return {
        artifacts: { validate: artifactPath },
        durationMs,
      };
    } catch (error) {
      const message = formatValidationFailure(error);
      const failed = this.options.repository.failOperation(operation.id, message);
      publishMediaDiagnostic({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        level: 'error',
        message,
      });
      publishMediaOperationFailed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: failed,
        message,
      });
      throw error;
    }
  }

  canHandleNodeKind(nodeKind: string): boolean {
    return nodeKind === NODE_KINDS.VALIDATE;
  }
}

class ValidationStageError extends Error {
  constructor(readonly failure: VideoValidationFailure) {
    super(`${failure.title}: ${failure.description}`);
    this.name = 'ValidationStageError';
  }
}

function formatValidationFailure(error: unknown): string {
  if (error instanceof ValidationStageError) {
    return `${error.failure.title}\n${error.failure.description}\nRecovery: ${error.failure.recoveryAction}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Input validation failed.';
}
