import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  ProcessExecutionError,
  runProcess,
  type ProcessExecutionDiagnostics,
} from '../subprocess/process-execution.js';
import type {
  ExtractAudioInput,
  ExtractAudioPort,
  ExtractAudioResult,
} from '../../ports/media-ports.js';

export interface FfmpegExtractAudioAdapterOptions {
  readonly ffmpegPath: string;
}

export class FfmpegExtractAudioAdapter implements ExtractAudioPort {
  constructor(private readonly options: FfmpegExtractAudioAdapterOptions) {}

  async extract(input: ExtractAudioInput): Promise<ExtractAudioResult> {
    const startedAt = Date.now();
    const audioPath = input.outputPath;
    await mkdir(dirname(audioPath), { recursive: true });

    const args = [
      '-y',
      '-i',
      input.filePath,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '16000',
      '-ac',
      '1',
      audioPath,
    ];

    input.onProgress(0);

    let diagnostics: ProcessExecutionDiagnostics;
    try {
      const result = await runProcess({
        executablePath: this.options.ffmpegPath,
        args,
      });
      diagnostics = result.diagnostics;
      input.onProgress(100);
    } catch (error) {
      if (error instanceof ProcessExecutionError) {
        throw error;
      }

      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${input.nodeId}-extract-audio.json`;

    return {
      audioPath,
      artifactPath,
      durationMs,
      diagnostics,
    };
  }

  buildArtifactContent(
    input: ExtractAudioInput,
    audioPath: string,
    diagnostics: ProcessExecutionDiagnostics,
  ): string {
    return JSON.stringify(
      {
        adapter: 'ffmpeg-extract-audio',
        sourcePath: input.filePath,
        audioPath,
        sampleRate: 16000,
        channels: 1,
        codec: 'pcm_s16le',
        diagnostics,
      },
      null,
      2,
    );
  }
}
