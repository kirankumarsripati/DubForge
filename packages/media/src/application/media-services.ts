import type { ArtifactSink } from '@dubforge/platform-execution-adapters';
import type { DomainEventBus } from '@dubforge/platform-events';
import { FfprobeExecutionError, type VideoProbeResult } from '@dubforge/shared';
import { PIPELINE_STAGE_CAPABILITY } from '@dubforge/providers';
import type { ExtensionRuntime } from '@dubforge/providers';
import { NODE_KINDS } from '@dubforge/types';

import { MEDIA_OPERATION_KINDS } from '../domain/constants.js';
import type { ProbeMediaPort } from '../ports/media-ports.js';
import type { ExtractAudioInput, ExtractAudioPort } from '../ports/media-ports.js';
import type { MuxMediaInput, MuxMediaPort } from '../ports/media-ports.js';
import { MediaRepository } from '../repository/media-repository.js';
import {
  publishMediaDiagnostic,
  publishMediaFileProbed,
  publishMediaOperationCompleted,
  publishMediaOperationFailed,
  publishMediaOperationStarted,
} from './media-event-publisher.js';

const IMPORT_WORKFLOW_PREFIX = 'import:';

function parseImportContentHash(workflowId: string): string | null {
  if (!workflowId.startsWith(IMPORT_WORKFLOW_PREFIX)) {
    return null;
  }

  const contentHash = workflowId.slice(IMPORT_WORKFLOW_PREFIX.length);
  return contentHash.length > 0 ? contentHash : null;
}

function isFlatFixtureProbe(
  probe:
    | VideoProbeResult
    | {
        readonly container: string;
        readonly durationSeconds: number;
        readonly bitrateKbps: number;
        readonly audioTrackCount: number;
        readonly width?: number;
        readonly height?: number;
        readonly videoCodec?: string;
        readonly videoStream?: VideoProbeResult['videoStream'];
      },
): probe is {
  readonly container: string;
  readonly durationSeconds: number;
  readonly bitrateKbps: number;
  readonly audioTrackCount: number;
  readonly width?: number;
  readonly height?: number;
  readonly videoCodec?: string;
} {
  return !('videoStream' in probe) || probe.videoStream === undefined;
}

function parseProbePayload(probeJson: string): VideoProbeResult {
  const payload = JSON.parse(probeJson) as {
    readonly probe:
      | VideoProbeResult
      | {
          readonly container: string;
          readonly durationSeconds: number;
          readonly bitrateKbps: number;
          readonly audioTrackCount: number;
          readonly width?: number;
          readonly height?: number;
          readonly videoCodec?: string;
          readonly videoStream?: VideoProbeResult['videoStream'];
        };
  };

  const probe = payload.probe;
  if (!isFlatFixtureProbe(probe)) {
    return probe;
  }

  return {
    container: probe.container,
    durationSeconds: probe.durationSeconds,
    bitrateKbps: probe.bitrateKbps,
    audioTrackCount: probe.audioTrackCount,
    videoStream: {
      codec: probe.videoCodec ?? 'Unknown',
      width: probe.width ?? 0,
      height: probe.height ?? 0,
      frameRate: 0,
    },
  };
}

export interface ProbeMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly probePort: ProbeMediaPort;
  readonly artifactSink?: ArtifactSink;
  readonly extensionRuntime?: ExtensionRuntime;
}

export class ProbeMediaService {
  constructor(private readonly options: ProbeMediaServiceOptions) {}

  async probeForWorkflow(input: {
    readonly filePath: string;
    readonly filename: string;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifactSink?: ArtifactSink;
    readonly fileSizeBytes?: number | null;
    readonly fileModifiedAtMs?: number | null;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const operation = this.options.repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.PROBE,
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
      if (
        this.options.extensionRuntime?.hasCapability(PIPELINE_STAGE_CAPABILITY, NODE_KINDS.METADATA)
      ) {
        publishMediaDiagnostic({
          eventBus: this.options.eventBus,
          workflowId: input.workflowId,
          jobId: input.jobId,
          nodeId: input.nodeId,
          level: 'info',
          message: 'Extension runtime capability available for metadata stage.',
        });
      }

      const result = await this.options.probePort.probe({
        filePath: input.filePath,
        filename: input.filename,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        artifactRoot: input.artifactRoot,
      });

      const probe = parseProbePayload(result.probeJson);
      const contentHash = parseImportContentHash(input.workflowId);

      const mediaFile = this.options.repository.createMediaFile({
        filePath: result.mediaFile.filePath,
        filename: result.mediaFile.filename,
        container: result.mediaFile.container.name,
        durationSeconds: result.mediaFile.duration.seconds,
        width: result.mediaFile.resolution.width,
        height: result.mediaFile.resolution.height,
        videoCodec: result.mediaFile.videoCodec.name,
        audioTrackCount: result.mediaFile.audioTrackCount,
        bitrateKbps: result.mediaFile.bitrateKbps,
        workflowId: input.workflowId,
        jobId: input.jobId,
        contentHash,
        fileSizeBytes: input.fileSizeBytes ?? null,
        fileModifiedAtMs: input.fileModifiedAtMs ?? null,
        frameRate: probe.videoStream.frameRate,
        metadataArtifactPath: result.artifactPath,
      });

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(result.artifactPath, result.probeJson);
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        result.artifactPath,
        result.durationMs,
      );

      publishMediaFileProbed({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        mediaFile,
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
        artifacts: { metadata: result.artifactPath },
        durationMs: result.durationMs,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Media probe failed.';
      if (error instanceof FfprobeExecutionError) {
        publishMediaDiagnostic({
          eventBus: this.options.eventBus,
          workflowId: input.workflowId,
          jobId: input.jobId,
          nodeId: input.nodeId,
          level: 'error',
          message: error.diagnostics.stderr || error.message,
        });
      }
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
}

export interface ExtractAudioServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly extractPort: ExtractAudioPort;
  readonly artifactSink?: ArtifactSink;
}

export class ExtractAudioService {
  constructor(private readonly options: ExtractAudioServiceOptions) {}

  async extractForWorkflow(input: {
    readonly filePath: string;
    readonly filename: string;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const mediaFile = this.options.repository.findMediaFileByWorkflow(input.workflowId);
    const operation = this.options.repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.EXTRACT_AUDIO,
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

    try {
      const outputPath = `${input.artifactRoot}/${input.nodeId}-audio.wav`;
      const extractInput = {
        filePath: input.filePath,
        filename: input.filename,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        artifactRoot: input.artifactRoot,
        outputPath,
        onProgress: input.onProgress,
      };

      const result = await this.options.extractPort.extract(extractInput);
      const artifactContent = buildExtractArtifactContent(
        this.options.extractPort,
        extractInput,
        result.audioPath,
      );

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(result.artifactPath, artifactContent);
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        result.artifactPath,
        result.durationMs,
      );

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
          'extract-audio': result.audioPath,
          'extract-audio-manifest': result.artifactPath,
        },
        durationMs: result.durationMs,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Audio extraction failed.';
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
}

export interface MuxMediaServiceOptions {
  readonly eventBus: DomainEventBus;
  readonly repository: MediaRepository;
  readonly muxPort: MuxMediaPort;
  readonly artifactSink?: ArtifactSink;
}

export class MuxMediaService {
  constructor(private readonly options: MuxMediaServiceOptions) {}

  async muxForWorkflow(input: {
    readonly videoPath: string;
    readonly workflowId: string;
    readonly jobId: string;
    readonly nodeId: string;
    readonly artifactRoot: string;
    readonly artifacts: Readonly<Record<string, string>>;
    readonly artifactSink?: ArtifactSink;
    readonly onProgress: (progress: number) => void;
  }): Promise<{
    readonly artifacts: Readonly<Record<string, string>>;
    readonly durationMs: number;
  }> {
    const mediaFile = this.options.repository.findMediaFileByWorkflow(input.workflowId);
    const operation = this.options.repository.startOperation({
      kind: MEDIA_OPERATION_KINDS.MUX,
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

    try {
      const audioPath = resolveAudioArtifactPath(input.artifacts);

      if (audioPath === undefined) {
        throw new Error('Mux stage requires an extracted audio artifact.');
      }

      const outputPath = `${input.artifactRoot}/${input.nodeId}-muxed.mkv`;
      const muxInput = {
        videoPath: input.videoPath,
        audioPath,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        artifactRoot: input.artifactRoot,
        outputPath,
        onProgress: input.onProgress,
      };

      const result = await this.options.muxPort.mux(muxInput);
      const artifactContent = buildMuxArtifactContent(
        this.options.muxPort,
        muxInput,
        result.outputPath,
      );

      const sink = input.artifactSink ?? this.options.artifactSink;
      if (sink !== undefined) {
        await sink.writeText(result.artifactPath, artifactContent);
      }

      const completed = this.options.repository.completeOperation(
        operation.id,
        result.artifactPath,
        result.durationMs,
      );

      publishMediaOperationCompleted({
        eventBus: this.options.eventBus,
        workflowId: input.workflowId,
        jobId: input.jobId,
        nodeId: input.nodeId,
        operation: completed,
        artifactPath: result.artifactPath,
      });

      return {
        artifacts: { mux: result.outputPath, 'mux-manifest': result.artifactPath },
        durationMs: result.durationMs,
      };
    } catch (error) {
      const failed = this.options.repository.failOperation(operation.id);
      const message = error instanceof Error ? error.message : 'Mux operation failed.';
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
}

interface ArtifactContentBuilder<TInput> {
  buildArtifactContent(input: TInput, outputPath: string): string;
}

function buildExtractArtifactContent(
  extractPort: ExtractAudioPort,
  input: ExtractAudioInput,
  audioPath: string,
): string {
  if (hasArtifactContentBuilder<ExtractAudioInput>(extractPort)) {
    return extractPort.buildArtifactContent(input, audioPath);
  }

  return JSON.stringify({ adapter: 'extract-audio', audioPath }, null, 2);
}

function buildMuxArtifactContent(
  muxPort: MuxMediaPort,
  input: MuxMediaInput,
  outputPath: string,
): string {
  if (hasArtifactContentBuilder<MuxMediaInput>(muxPort)) {
    return muxPort.buildArtifactContent(input, outputPath);
  }

  return JSON.stringify({ adapter: 'mux', outputPath }, null, 2);
}

function hasArtifactContentBuilder<TInput>(port: unknown): port is ArtifactContentBuilder<TInput> {
  return (
    typeof port === 'object' &&
    port !== null &&
    'buildArtifactContent' in port &&
    typeof port.buildArtifactContent === 'function'
  );
}

function resolveAudioArtifactPath(artifacts: Readonly<Record<string, string>>): string | undefined {
  if (artifacts['extract-audio'] !== undefined) {
    return artifacts['extract-audio'];
  }

  const wavArtifact = Object.values(artifacts).find((path) => path.endsWith('.wav'));
  if (wavArtifact !== undefined) {
    return wavArtifact;
  }

  const audioKeyMatch = Object.entries(artifacts).find(
    ([key, path]) => key.includes('audio') || path.includes('audio'),
  );

  return audioKeyMatch?.[1] ?? artifacts.speech;
}
