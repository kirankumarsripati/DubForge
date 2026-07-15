import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { NODE_KINDS } from '@dubforge/types';

import { MEDIA_OPERATION_KINDS } from '../domain/constants.js';
import type { FingerprintMediaPort } from '../ports/media-ports.js';
import { MediaRepository } from '../repository/media-repository.js';
import {
  publishMediaFingerprintComputed,
  publishMediaOperationCompleted,
  publishMediaOperationFailed,
  publishMediaOperationStarted,
  publishMediaDiagnostic,
} from './media-event-publisher.js';

export interface FingerprintMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly fingerprintPort: FingerprintMediaPort;
  readonly artifactSink?: ArtifactSink;
}

export class FingerprintMediaService {
  constructor(private readonly options: FingerprintMediaServiceOptions) {}

  async fingerprintForWorkflow(input: {
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
    readonly contentHash: string;
  }> {
    const operation = this.options.repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.FINGERPRINT,
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
      const result = await this.options.fingerprintPort.fingerprint({
        filePath: input.filePath,
        filename: input.filename,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        artifactRoot: input.artifactRoot,
        fileSizeBytes: input.fileSizeBytes,
        fileModifiedAtMs: input.fileModifiedAtMs,
      });

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(result.artifactPath, result.fingerprintJson);
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        result.artifactPath,
        result.durationMs,
      );

      publishMediaFingerprintComputed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        contentHash: result.contentHash,
        artifactPath: result.artifactPath,
      });

      publishMediaOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: result.artifactPath,
      });

      return {
        artifacts: {
          fingerprint: result.artifactPath,
          contentHash: result.contentHash,
        },
        durationMs: result.durationMs,
        contentHash: result.contentHash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Fingerprint computation failed.';
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
    return nodeKind === NODE_KINDS.FINGERPRINT;
  }
}
