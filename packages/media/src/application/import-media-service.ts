import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import { ExecutionAdapterRegistry } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { createExecutionPlatform } from '@dubforge/platform-execution';
import {
  createFfprobeValidationFailure,
  FfprobeExecutionError,
  FfprobeParseError,
  VideoValidationException,
  type VideoProbeResult,
} from '@dubforge/shared';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import { NODE_KINDS } from '@dubforge/types';

import type { FfprobeDiagnosticsCollector } from '../diagnostics/ffprobe-diagnostics.js';
import type { MediaFile } from '../domain/entities/media-entities.js';
import type { MediaExecutionAdapter } from '../integration/media-execution-adapter.js';
import type { MediaRepository } from '../repository/media-repository.js';

export interface ImportMediaProbeInput {
  readonly filePath: string;
  readonly filename: string;
  readonly contentHash: string;
  readonly fileSizeBytes: number;
  readonly fileModifiedAtMs: number;
  readonly artifactRoot: string;
  readonly artifactSink?: ArtifactSink;
}

export interface ImportMediaProbeResult {
  readonly mediaFile: MediaFile;
  readonly probe: VideoProbeResult;
  readonly metadataArtifactPath: string;
}

export interface ImportMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly executionAdapter: MediaExecutionAdapter;
  readonly repository: MediaRepository;
  readonly ffprobeDiagnostics: FfprobeDiagnosticsCollector;
  readonly artifactSink?: ArtifactSink;
}

export class ImportMediaService {
  private readonly executionPlatform;

  constructor(private readonly options: ImportMediaServiceOptions) {
    this.executionPlatform = createExecutionPlatform({
      eventBus: options.eventBus,
      adapterRegistry: new ExecutionAdapterRegistry([options.executionAdapter]),
      artifactSink: options.artifactSink,
      defaultTimeoutMs: 120_000,
    });
  }

  async probeImportedFile(input: ImportMediaProbeInput): Promise<ImportMediaProbeResult> {
    const workflowId = `import:${input.contentHash}`;
    const jobId = 'import';
    const nodeId = 'metadata';

    try {
      const result = await this.executionPlatform.createNodeExecutionPort().execute({
        workflowId,
        jobId,
        nodeId,
        nodeKind: NODE_KINDS.METADATA,
        languageCode: null,
        videoPath: input.filePath,
        videoFilename: input.filename,
        durationSeconds: 0,
        profile: 'fast',
        output: DEFAULT_OUTPUT_CONFIGURATION,
        outputDirectory: input.artifactRoot,
        artifactRoot: input.artifactRoot,
        artifacts: {
          __import_file_size: String(input.fileSizeBytes),
          __import_file_modified: String(input.fileModifiedAtMs),
        },
        signal: new AbortController().signal,
        onProgress: () => undefined,
      });

      const metadataArtifactPath = result.artifacts.metadata;
      if (metadataArtifactPath === undefined) {
        throw new Error('Metadata probe did not register a metadata artifact.');
      }

      const { readFile } = await import('node:fs/promises');
      const artifactContent = JSON.parse(await readFile(metadataArtifactPath, 'utf8')) as {
        readonly probe: VideoProbeResult;
        readonly diagnostics?: {
          readonly executablePath: string;
          readonly args: readonly string[];
          readonly command: string;
          readonly exitCode: number | null;
          readonly stderr: string;
        };
      };

      if (artifactContent.diagnostics !== undefined) {
        this.options.ffprobeDiagnostics.recordSuccess({
          filePath: input.filePath,
          diagnostics: artifactContent.diagnostics,
        });
      }

      const mediaFile = this.options.repository.findMediaFileByContentHash(input.contentHash);
      if (mediaFile === null) {
        throw new Error('Probed media file was not persisted to the media catalog.');
      }

      return {
        mediaFile,
        probe: artifactContent.probe,
        metadataArtifactPath,
      };
    } catch (error) {
      if (error instanceof FfprobeExecutionError) {
        this.options.ffprobeDiagnostics.recordFailure({
          filePath: input.filePath,
          diagnostics: error.diagnostics,
          message: error.message,
        });
        throw new VideoValidationException(createFfprobeValidationFailure(error.diagnostics));
      }

      if (error instanceof FfprobeParseError) {
        throw error;
      }

      if (error instanceof VideoValidationException) {
        throw error;
      }

      throw error;
    }
  }
}
