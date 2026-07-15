import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  BinaryProcessError,
  formatBinaryDiagnostics,
  runBinaryProcess,
} from '@dubforge/platform-execution-adapters';

import type { MuxMediaInput, MuxMediaPort, MuxMediaResult } from '../../ports/media-ports.js';

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

    try {
      input.onProgress(0);
      await runBinaryProcess({
        executablePath: this.options.ffmpegPath,
        args,
      });
      input.onProgress(100);
    } catch (error) {
      if (error instanceof BinaryProcessError) {
        throw new Error(formatBinaryDiagnostics(error.diagnostics));
      }

      throw error;
    }

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
}
