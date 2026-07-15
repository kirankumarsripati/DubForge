import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

import type { MuxMediaInput, MuxMediaPort, MuxMediaResult } from '../../ports/media-ports.js';

const execFileAsync = promisify(execFile);

export interface FfmpegMuxAdapterOptions {
  readonly ffmpegPath: string;
}

export class FfmpegMuxAdapter implements MuxMediaPort {
  constructor(private readonly options: FfmpegMuxAdapterOptions) {}

  async mux(input: MuxMediaInput): Promise<MuxMediaResult> {
    const startedAt = Date.now();
    await mkdir(dirname(input.outputPath), { recursive: true });

    const args = [
      '-y',
      '-i',
      input.videoPath,
      '-i',
      input.audioPath,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      input.outputPath,
    ];

    await this.runFfmpeg(args, input.onProgress);
    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${input.nodeId}-mux.json`;

    return {
      outputPath: input.outputPath,
      artifactPath,
      durationMs,
    };
  }

  buildArtifactContent(input: MuxMediaInput, outputPath: string): string {
    return JSON.stringify(
      {
        adapter: 'ffmpeg-mux',
        videoPath: input.videoPath,
        audioPath: input.audioPath,
        outputPath,
        videoCodec: 'copy',
        audioCodec: 'aac',
      },
      null,
      2,
    );
  }

  private async runFfmpeg(
    args: readonly string[],
    onProgress: (progress: number) => void,
  ): Promise<void> {
    onProgress(0);

    try {
      await execFileAsync(this.options.ffmpegPath, [...args], {
        maxBuffer: 10 * 1024 * 1024,
      });
      onProgress(100);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message || 'ffmpeg failed to mux media.');
      }

      throw new Error('ffmpeg failed to mux media.');
    }
  }
}
