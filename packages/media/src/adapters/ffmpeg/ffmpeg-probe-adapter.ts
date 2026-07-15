import { randomUUID } from 'node:crypto';

import {
  FfprobeExecutionError,
  FfprobeParseError,
  type FfprobeDiagnostics,
} from '@dubforge/shared';
import { probeVideoFile } from '@dubforge/shared/node/ffprobe';

import { normalizeCodecName } from '../../domain/value-objects/codec.js';
import { primaryContainerFormat } from '../../domain/value-objects/container-format.js';
import { createDuration } from '../../domain/value-objects/duration.js';
import { createResolution } from '../../domain/value-objects/resolution.js';
import type { ProbeMediaInput, ProbeMediaPort, ProbeMediaResult } from '../../ports/media-ports.js';
import { createCodec } from '../../domain/value-objects/codec.js';

export interface FfmpegProbeAdapterOptions {
  readonly ffprobePath: string;
}

export class FfmpegProbeAdapter implements ProbeMediaPort {
  constructor(private readonly options: FfmpegProbeAdapterOptions) {}

  async probe(input: ProbeMediaInput): Promise<ProbeMediaResult> {
    const startedAt = Date.now();
    let probeResult;
    let diagnostics: FfprobeDiagnostics;

    try {
      const result = await probeVideoFile(this.options.ffprobePath, input.filePath);
      probeResult = result.probe;
      diagnostics = result.diagnostics;
    } catch (error) {
      if (error instanceof FfprobeExecutionError) {
        throw error;
      }

      if (error instanceof FfprobeParseError) {
        throw error;
      }

      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${input.nodeId}-metadata.json`;
    const probeJson = JSON.stringify(
      {
        adapter: 'ffmpeg-probe',
        filePath: input.filePath,
        probe: probeResult,
        diagnostics,
        probedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    const mediaFile = {
      id: randomUUID(),
      filePath: input.filePath,
      filename: input.filename,
      container: primaryContainerFormat(probeResult.container),
      duration: createDuration(probeResult.durationSeconds),
      resolution: createResolution(probeResult.videoStream.width, probeResult.videoStream.height),
      videoCodec: createCodec(normalizeCodecName(probeResult.videoStream.codec)),
      audioTrackCount: probeResult.audioTrackCount,
      bitrateKbps: probeResult.bitrateKbps,
      probedAt: new Date().toISOString(),
      workflowId: input.workflowId,
      jobId: input.jobId,
    };

    return {
      mediaFile,
      artifactPath,
      probeJson,
      durationMs,
      diagnostics,
    };
  }
}
