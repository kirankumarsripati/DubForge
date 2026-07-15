import { readFile } from 'node:fs/promises';

import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { DEFAULT_OUTPUT_CONFIGURATION } from '@dubforge/job-config';
import type { NodeExecutionPort, CancellationSignal } from '@dubforge/platform-execution';
import {
  calculateThumbnailTimestampSeconds,
  createFfprobeValidationFailure,
  FfprobeExecutionError,
  FfprobeParseError,
  validateVideoProbe,
  VideoValidationException,
  type VideoProbeResult,
} from '@dubforge/shared';
import { NODE_KINDS } from '@dubforge/types';

import { MEDIA_ARTIFACT_FILENAMES } from '../domain/artifact-names.js';
import { MEDIA_IMPORT_NODE_IDS } from '../domain/constants.js';
import type { MediaFile } from '../domain/entities/media-entities.js';
import type { FfprobeDiagnosticsCollector } from '../diagnostics/ffprobe-diagnostics.js';
import type { MediaRepository } from '../repository/media-repository.js';
import { publishMediaImportCompleted } from './media-event-publisher.js';

export interface ImportMediaInput {
  readonly filePath: string;
  readonly filename: string;
  readonly contentHash?: string;
  readonly fileSizeBytes: number;
  readonly fileModifiedAtMs: number;
  readonly artifactRoot: string;
  readonly artifactSink?: ArtifactSink;
}

export interface ImportMediaArtifacts {
  readonly validate: string;
  readonly fingerprint: string;
  readonly metadata: string;
  readonly thumbnail: string;
  readonly thumbnailManifest: string;
  readonly audio: string;
  readonly audioManifest: string;
}

export interface ImportMediaResult {
  readonly mediaFile: MediaFile;
  readonly probe: VideoProbeResult;
  readonly contentHash: string;
  readonly artifacts: ImportMediaArtifacts;
}

export interface ImportMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly nodeExecutor: NodeExecutionPort;
  readonly ffprobeDiagnostics: FfprobeDiagnosticsCollector;
  readonly artifactSink?: ArtifactSink;
}

const IMPORT_JOB_ID = 'import';
const IMPORT_PROFILE = 'balanced' as const;

const IMPORT_ABORT_SIGNAL: CancellationSignal = {
  aborted: false,
  addEventListener: () => undefined,
};

export class ImportMediaService {
  constructor(private readonly options: ImportMediaServiceOptions) {}

  async importVideoFile(input: ImportMediaInput): Promise<ImportMediaResult> {
    const artifactSink = input.artifactSink ?? this.options.artifactSink;
    const importArtifacts = {
      __import_file_size: String(input.fileSizeBytes),
      __import_file_modified: String(input.fileModifiedAtMs),
    };

    await this.executeImportNode({
      workflowId: 'import:pending',
      nodeId: MEDIA_IMPORT_NODE_IDS.VALIDATE,
      nodeKind: NODE_KINDS.VALIDATE,
      input,
      artifacts: importArtifacts,
      artifactSink,
    });

    const fingerprintResult = await this.executeImportNode({
      workflowId: 'import:pending',
      nodeId: MEDIA_IMPORT_NODE_IDS.FINGERPRINT,
      nodeKind: NODE_KINDS.FINGERPRINT,
      input,
      artifacts: importArtifacts,
      artifactSink,
    });

    const fingerprintArtifact = fingerprintResult.artifacts.fingerprint;
    if (fingerprintArtifact === undefined) {
      throw new Error('Fingerprint stage did not register a fingerprint artifact.');
    }

    const contentHash = fingerprintResult.artifacts.contentHash;
    if (contentHash === undefined || contentHash.length === 0) {
      throw new Error('Fingerprint stage did not produce a content hash.');
    }

    if (input.contentHash !== undefined && input.contentHash !== contentHash) {
      throw new Error('Fingerprint hash does not match the expected content hash.');
    }

    const workflowId = `import:${contentHash}`;
    this.options.repository.reassignWorkflowId('import:pending', workflowId);

    try {
      const metadataResult = await this.executeImportNode({
        workflowId,
        nodeId: MEDIA_IMPORT_NODE_IDS.METADATA,
        nodeKind: NODE_KINDS.METADATA,
        input,
        artifacts: importArtifacts,
        artifactSink,
      });

      const metadataArtifactPath = metadataResult.artifacts.metadata;
      if (metadataArtifactPath === undefined) {
        throw new Error('Metadata probe did not register a metadata artifact.');
      }

      const artifactContent = JSON.parse(await readFile(metadataArtifactPath, 'utf8')) as {
        readonly probe: VideoProbeResult;
        readonly diagnostics?: Parameters<
          FfprobeDiagnosticsCollector['recordSuccess']
        >[0]['diagnostics'];
      };

      if (artifactContent.diagnostics !== undefined) {
        this.options.ffprobeDiagnostics.recordSuccess({
          filePath: input.filePath,
          diagnostics: artifactContent.diagnostics,
        });
      }

      const probeResult = artifactContent.probe;
      const probeFailure = validateVideoProbe(probeResult);
      if (probeFailure !== null) {
        throw new VideoValidationException(probeFailure);
      }

      const mediaFileAfterProbe = this.options.repository.findMediaFileByContentHash(contentHash);
      if (mediaFileAfterProbe !== null) {
        this.options.repository.updateMediaFileArtifacts(mediaFileAfterProbe.id, {
          fingerprintArtifactPath: fingerprintArtifact,
        });
      }

      const thumbnailTimestamp = calculateThumbnailTimestampSeconds(probeResult.durationSeconds);
      const thumbnailResult = await this.executeImportNode({
        workflowId,
        nodeId: MEDIA_IMPORT_NODE_IDS.THUMBNAIL,
        nodeKind: NODE_KINDS.THUMBNAIL,
        input,
        artifacts: {
          ...importArtifacts,
          __thumbnail_timestamp: String(thumbnailTimestamp),
        },
        artifactSink,
        durationSeconds: probeResult.durationSeconds,
      });

      const extractResult = await this.executeImportNode({
        workflowId,
        nodeId: MEDIA_IMPORT_NODE_IDS.EXTRACT_AUDIO,
        nodeKind: NODE_KINDS.EXTRACT_AUDIO,
        input,
        artifacts: importArtifacts,
        artifactSink,
        durationSeconds: probeResult.durationSeconds,
      });

      const thumbnailPath = thumbnailResult.artifacts.thumbnail;
      const thumbnailManifest = thumbnailResult.artifacts['thumbnail-manifest'];
      const audioPath = extractResult.artifacts['extract-audio'];
      const audioManifest = extractResult.artifacts['extract-audio-manifest'];

      if (
        thumbnailPath === undefined ||
        thumbnailManifest === undefined ||
        audioPath === undefined ||
        audioManifest === undefined
      ) {
        throw new Error('Media import pipeline did not produce all required artifacts.');
      }

      const mediaFile = this.options.repository.findMediaFileByContentHash(contentHash);
      if (mediaFile === null) {
        throw new Error('Imported media file was not persisted to the media catalog.');
      }

      const artifacts: ImportMediaArtifacts = {
        validate: `${input.artifactRoot}/${MEDIA_ARTIFACT_FILENAMES.VALIDATE}`,
        fingerprint: fingerprintArtifact,
        metadata: metadataArtifactPath,
        thumbnail: thumbnailPath,
        thumbnailManifest,
        audio: audioPath,
        audioManifest,
      };

      this.options.repository.updateMediaFileArtifacts(mediaFile.id, {
        fingerprintArtifactPath: artifacts.fingerprint,
        metadataArtifactPath: artifacts.metadata,
        thumbnailArtifactPath: artifacts.thumbnail,
        audioArtifactPath: artifacts.audio,
      });

      publishMediaImportCompleted({
        eventBus: this.options.eventBus,
        workflowId,
        jobId: IMPORT_JOB_ID,
        mediaFileId: mediaFile.id,
        contentHash,
        artifactPaths: {
          fingerprint: artifacts.fingerprint,
          metadata: artifacts.metadata,
          thumbnail: artifacts.thumbnail,
          audio: artifacts.audio,
        },
      });

      return {
        mediaFile,
        probe: probeResult,
        contentHash,
        artifacts,
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

  async probeImportedFile(input: ImportMediaInput): Promise<ImportMediaResult> {
    return this.importVideoFile(input);
  }

  private executeImportNode(input: {
    readonly workflowId: string;
    readonly nodeId: string;
    readonly nodeKind: (typeof NODE_KINDS)[keyof typeof NODE_KINDS];
    readonly input: ImportMediaInput;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly artifactSink?: ArtifactSink;
    readonly durationSeconds?: number;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    return this.options.nodeExecutor.execute({
      workflowId: input.workflowId,
      jobId: IMPORT_JOB_ID,
      nodeId: input.nodeId,
      nodeKind: input.nodeKind,
      languageCode: null,
      videoPath: input.input.filePath,
      videoFilename: input.input.filename,
      durationSeconds: input.durationSeconds ?? 0,
      profile: IMPORT_PROFILE,
      output: DEFAULT_OUTPUT_CONFIGURATION,
      outputDirectory: input.input.artifactRoot,
      artifactRoot: input.input.artifactRoot,
      artifacts: input.artifacts,
      signal: IMPORT_ABORT_SIGNAL,
      onProgress: () => undefined,
    });
  }
}
