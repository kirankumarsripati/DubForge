import { randomUUID } from 'node:crypto';

import { ffprobeOutputSchema } from '@dubforge/shared';
import { parseFfprobeOutput } from '@dubforge/shared';
import {
  FfprobeExecutionError,
  FfprobeParseError,
  buildFfprobeArgs,
  type FfprobeDiagnostics,
} from '@dubforge/shared';
import { BinaryProcessError, runBinaryProcess } from '@dubforge/platform-execution-adapters';

import { MEDIA_ARTIFACT_FILENAMES } from '../../domain/artifact-names.js';
import { normalizeCodecName } from '../../domain/value-objects/codec.js';
import { primaryContainerFormat } from '../../domain/value-objects/container-format.js';
import { createDuration } from '../../domain/value-objects/duration.js';
import { createResolution } from '../../domain/value-objects/resolution.js';
import type { ProbeMediaInput, ProbeMediaPort, ProbeMediaResult } from '../../ports/media-ports.js';
import { createCodec } from '../../domain/value-objects/codec.js';

export interface FfmpegProbeAdapterOptions {
  readonly ffprobePath: string;
}

function toFfprobeDiagnostics(diagnostics: {
  readonly executablePath: string;
  readonly args: readonly string[];
  readonly command: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly workingDirectory: string;
  readonly durationMs: number;
}): FfprobeDiagnostics {
  return diagnostics;
}

export class FfmpegProbeAdapter implements ProbeMediaPort {
  constructor(private readonly options: FfmpegProbeAdapterOptions) {}

  async probe(input: ProbeMediaInput): Promise<ProbeMediaResult> {
    const startedAt = Date.now();
    const args = buildFfprobeArgs(input.filePath);

    let probeResult;
    let diagnostics: FfprobeDiagnostics;

    try {
      const result = await runBinaryProcess({
        executablePath: this.options.ffprobePath,
        args,
      });
      diagnostics = toFfprobeDiagnostics(result.diagnostics);

      try {
        const parsed = ffprobeOutputSchema.parse(JSON.parse(result.stdout));
        probeResult = parseFfprobeOutput(parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse ffprobe output.';
        throw new FfprobeParseError(message);
      }
    } catch (error) {
      if (error instanceof FfprobeParseError) {
        throw error;
      }

      if (error instanceof BinaryProcessError) {
        throw new FfprobeExecutionError(error.message, toFfprobeDiagnostics(error.diagnostics));
      }

      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${MEDIA_ARTIFACT_FILENAMES.METADATA}`;
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
