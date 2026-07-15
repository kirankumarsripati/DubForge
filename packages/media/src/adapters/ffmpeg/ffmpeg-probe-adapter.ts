import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { ffprobeOutputSchema, parseFfprobeOutput } from '@dubforge/shared';

import { normalizeCodecName } from '../../domain/value-objects/codec.js';
import { primaryContainerFormat } from '../../domain/value-objects/container-format.js';
import { createDuration } from '../../domain/value-objects/duration.js';
import { createResolution } from '../../domain/value-objects/resolution.js';
import type { ProbeMediaInput, ProbeMediaPort, ProbeMediaResult } from '../../ports/media-ports.js';
import { createCodec } from '../../domain/value-objects/codec.js';
import { randomUUID } from 'node:crypto';

const execFileAsync = promisify(execFile);

export interface FfmpegProbeAdapterOptions {
  readonly ffprobePath: string;
}

export class FfmpegProbeAdapter implements ProbeMediaPort {
  constructor(private readonly options: FfmpegProbeAdapterOptions) {}

  async probe(input: ProbeMediaInput): Promise<ProbeMediaResult> {
    const startedAt = Date.now();
    const stdout = await this.runProbe(input.filePath);
    const parsed = ffprobeOutputSchema.parse(JSON.parse(stdout));
    const probeResult = parseFfprobeOutput(parsed);
    const durationMs = Date.now() - startedAt;

    const artifactPath = `${input.artifactRoot}/${input.nodeId}-metadata.json`;
    const probeJson = JSON.stringify(
      {
        adapter: 'ffmpeg-probe',
        filePath: input.filePath,
        probe: probeResult,
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
    };
  }

  private async runProbe(filePath: string): Promise<string> {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    try {
      const { stdout } = await execFileAsync(this.options.ffprobePath, args, {
        maxBuffer: 10 * 1024 * 1024,
      });
      return stdout;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message || 'ffprobe failed to inspect the media file.');
      }

      throw new Error('ffprobe failed to inspect the media file.');
    }
  }
}
