import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';

import {
  ProcessExecutionError,
  formatProcessDiagnostics,
} from '../adapters/subprocess/process-execution.js';
import { MEDIA_OPERATION_KINDS } from '../domain/constants.js';
import type { ThumbnailMediaPort } from '../ports/media-ports.js';
import { MediaRepository } from '../repository/media-repository.js';
import {
  publishMediaDiagnostic,
  publishMediaOperationCompleted,
  publishMediaOperationFailed,
  publishMediaOperationStarted,
  publishMediaThumbnailGenerated,
} from './media-event-publisher.js';

export interface ThumbnailMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly thumbnailPort: ThumbnailMediaPort;
  readonly artifactSink?: ArtifactSink;
}

export class ThumbnailMediaService {
  constructor(private readonly options: ThumbnailMediaServiceOptions) {}

  async generateForWorkflow(input: {
    readonly filePath: string;
    readonly filename: string;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly timestampSeconds: number;
    readonly artifactSink?: ArtifactSink;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const mediaFile = this.options.repository.findMediaFileByWorkflow(input.workflowId);
    const operation = this.options.repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.THUMBNAIL,
      mediaFileId: mediaFile?.id ?? null,
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

    const outputPath = `${input.artifactRoot}/${input.nodeId}-thumbnail.png`;

    try {
      const result = await this.options.thumbnailPort.generate({
        filePath: input.filePath,
        filename: input.filename,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        artifactRoot: input.artifactRoot,
        outputPath,
        timestampSeconds: input.timestampSeconds,
      });

      const artifactContent = JSON.stringify(
        {
          adapter: 'ffmpeg-thumbnail',
          sourcePath: input.filePath,
          thumbnailPath: result.thumbnailPath,
          timestampSeconds: input.timestampSeconds,
          diagnostics: result.diagnostics,
        },
        null,
        2,
      );
      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(result.artifactPath, artifactContent);
      }

      if (mediaFile !== null) {
        this.options.repository.updateMediaFileArtifacts(mediaFile.id, {
          thumbnailArtifactPath: result.thumbnailPath,
        });
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        result.artifactPath,
        result.durationMs,
      );

      publishMediaThumbnailGenerated({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        artifactPath: result.artifactPath,
        thumbnailPath: result.thumbnailPath,
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
          thumbnail: result.thumbnailPath,
          'thumbnail-manifest': result.artifactPath,
        },
        durationMs: result.durationMs,
      };
    } catch (error) {
      const message = this.formatFailureMessage(error);
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

  private formatFailureMessage(error: unknown): string {
    if (error instanceof ProcessExecutionError) {
      return formatProcessDiagnostics(error.diagnostics);
    }

    return error instanceof Error ? error.message : 'Thumbnail generation failed.';
  }
}
