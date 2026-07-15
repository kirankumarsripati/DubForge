import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

import type {
  ExtractAudioInput,
  ExtractAudioPort,
  ExtractAudioResult,
} from '../../ports/media-ports.js';

const execFileAsync = promisify(execFile);

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

    await this.runFfmpeg(args, input.onProgress);
    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${input.nodeId}-extract-audio.json`;

    return {
      audioPath,
      artifactPath,
      durationMs,
    };
  }

  buildArtifactContent(input: ExtractAudioInput, audioPath: string): string {
    return JSON.stringify(
      {
        adapter: 'ffmpeg-extract-audio',
        sourcePath: input.filePath,
        audioPath,
        sampleRate: 16000,
        channels: 1,
        codec: 'pcm_s16le',
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
        throw new Error(error.message || 'ffmpeg failed to extract audio.');
      }

      throw new Error('ffmpeg failed to extract audio.');
    }
  }
}
