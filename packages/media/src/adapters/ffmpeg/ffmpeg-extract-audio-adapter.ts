import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  runBinaryProcess,
  type BinaryProcessDiagnostics,
} from '@dubforge/platform-execution-adapters';

import { MEDIA_ARTIFACT_FILENAMES } from '../../domain/artifact-names.js';
import type {
  ExtractAudioInput,
  ExtractAudioPort,
  ExtractAudioResult,
} from '../../ports/media-ports.js';

export {
  BinaryProcessError as ProcessExecutionError,
  formatBinaryDiagnostics as formatProcessDiagnostics,
  type BinaryProcessDiagnostics as ProcessExecutionDiagnostics,
} from '@dubforge/platform-execution-adapters';

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

    const result = await runBinaryProcess({
      executablePath: this.options.ffmpegPath,
      args,
    });

    input.onProgress(100);

    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${MEDIA_ARTIFACT_FILENAMES.AUDIO_MANIFEST}`;

    return {
      audioPath,
      artifactPath,
      durationMs,
      diagnostics: result.diagnostics,
    };
  }

  buildArtifactContent(
    input: ExtractAudioInput,
    audioPath: string,
    diagnostics: BinaryProcessDiagnostics,
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
