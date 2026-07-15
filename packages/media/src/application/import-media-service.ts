import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import {
  calculateThumbnailTimestampSeconds,
  createFfprobeValidationFailure,
  FfprobeExecutionError,
  FfprobeParseError,
  VideoValidationException,
  type VideoProbeResult,
} from '@dubforge/shared';

import { MEDIA_IMPORT_NODE_IDS } from '../domain/constants.js';
import type { MediaFile } from '../domain/entities/media-entities.js';
import type { FfprobeDiagnosticsCollector } from '../diagnostics/ffprobe-diagnostics.js';
import type { MediaRepository } from '../repository/media-repository.js';
import { ExtractAudioService } from './media-services.js';
import { FingerprintMediaService } from './fingerprint-media-service.js';
import { ProbeMediaService } from './media-services.js';
import { ThumbnailMediaService } from './thumbnail-media-service.js';
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
  readonly fingerprintService: FingerprintMediaService;
  readonly probeService: ProbeMediaService;
  readonly thumbnailService: ThumbnailMediaService;
  readonly extractAudioService: ExtractAudioService;
  readonly ffprobeDiagnostics: FfprobeDiagnosticsCollector;
  readonly artifactSink?: ArtifactSink;
}

export class ImportMediaService {
  constructor(private readonly options: ImportMediaServiceOptions) {}

  async importVideoFile(input: ImportMediaInput): Promise<ImportMediaResult> {
    const jobId = 'import';
    const artifactSink = input.artifactSink ?? this.options.artifactSink;

    const fingerprintResult = await this.options.fingerprintService.fingerprintForWorkflow({
      filePath: input.filePath,
      filename: input.filename,
      workflowId: 'import:pending',
      jobId,
      nodeId: MEDIA_IMPORT_NODE_IDS.FINGERPRINT,
      artifactRoot: input.artifactRoot,
      fileSizeBytes: input.fileSizeBytes,
      fileModifiedAtMs: input.fileModifiedAtMs,
      artifactSink,
    });

    const contentHash = fingerprintResult.contentHash;
    const fingerprintArtifact = fingerprintResult.artifacts.fingerprint;
    if (fingerprintArtifact === undefined) {
      throw new Error('Fingerprint stage did not register a fingerprint artifact.');
    }

    if (input.contentHash !== undefined && input.contentHash !== contentHash) {
      throw new Error('Fingerprint hash does not match the expected content hash.');
    }

    const workflowId = `import:${contentHash}`;
    this.options.repository.reassignWorkflowId('import:pending', workflowId);

    let probeResult;
    try {
      const metadataResult = await this.options.probeService.probeForWorkflow({
        filePath: input.filePath,
        filename: input.filename,
        workflowId,
        jobId,
        nodeId: MEDIA_IMPORT_NODE_IDS.METADATA,
        artifactRoot: input.artifactRoot,
        artifactSink,
        fileSizeBytes: input.fileSizeBytes,
        fileModifiedAtMs: input.fileModifiedAtMs,
      });

      const metadataArtifactPath = metadataResult.artifacts.metadata;
      if (metadataArtifactPath === undefined) {
        throw new Error('Metadata probe did not register a metadata artifact.');
      }

      const { readFile } = await import('node:fs/promises');
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

      probeResult = artifactContent.probe;

      const mediaFileAfterProbe = this.options.repository.findMediaFileByContentHash(contentHash);
      if (mediaFileAfterProbe !== null) {
        this.options.repository.updateMediaFileArtifacts(mediaFileAfterProbe.id, {
          fingerprintArtifactPath: fingerprintArtifact,
        });
      }

      const thumbnailTimestamp = calculateThumbnailTimestampSeconds(probeResult.durationSeconds);
      const thumbnailResult = await this.options.thumbnailService.generateForWorkflow({
        filePath: input.filePath,
        filename: input.filename,
        workflowId,
        jobId,
        nodeId: MEDIA_IMPORT_NODE_IDS.THUMBNAIL,
        artifactRoot: input.artifactRoot,
        timestampSeconds: thumbnailTimestamp,
        artifactSink,
      });

      const extractResult = await this.options.extractAudioService.extractForWorkflow({
        filePath: input.filePath,
        filename: input.filename,
        workflowId,
        jobId,
        nodeId: MEDIA_IMPORT_NODE_IDS.EXTRACT_AUDIO,
        artifactRoot: input.artifactRoot,
        artifactSink,
        onProgress: () => undefined,
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
        jobId,
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
}
