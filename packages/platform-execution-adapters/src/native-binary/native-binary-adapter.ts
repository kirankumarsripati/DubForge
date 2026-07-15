import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { NODE_KINDS } from '@dubforge/types';

import { EXECUTION_ADAPTER_KINDS } from '../types.js';
import type {
  ExecutionAdapter,
  ExecutionAdapterRequest,
  ExecutionAdapterResult,
} from '../types.js';
import {
  BinaryProcessError,
  formatBinaryDiagnostics,
  runBinaryProcess,
} from './binary-process-runner.js';

const THUMBNAIL_WIDTH = 320;
const THUMBNAIL_HEIGHT = 180;
const AUDIO_FILENAME = 'audio.wav';
const AUDIO_MANIFEST_FILENAME = 'audio-manifest.json';
const THUMBNAIL_FILENAME = 'thumbnail.webp';
const THUMBNAIL_MANIFEST_FILENAME = 'thumbnail-manifest.json';

export interface NativeBinaryExecutionAdapterOptions {
  readonly ffmpegPath?: string;
  readonly ffprobePath?: string;
}

export class NativeBinaryExecutionAdapter implements ExecutionAdapter {
  readonly kind = EXECUTION_ADAPTER_KINDS.NATIVE_BINARY;

  constructor(private readonly options: NativeBinaryExecutionAdapterOptions = {}) {}

  canHandle(request: ExecutionAdapterRequest): boolean {
    return (
      request.nodeKind === NODE_KINDS.EXTRACT_AUDIO ||
      request.nodeKind === NODE_KINDS.MUX ||
      request.nodeKind === NODE_KINDS.THUMBNAIL
    );
  }

  async execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResult> {
    const startedAt = Date.now();
    const ffmpegPath = this.options.ffmpegPath ?? 'ffmpeg';

    try {
      if (request.nodeKind === NODE_KINDS.EXTRACT_AUDIO) {
        return await this.extractAudio(request, ffmpegPath, startedAt);
      }

      if (request.nodeKind === NODE_KINDS.THUMBNAIL) {
        return await this.generateThumbnail(request, ffmpegPath, startedAt);
      }

      return await this.mux(request, ffmpegPath, startedAt);
    } catch (error) {
      if (error instanceof BinaryProcessError) {
        throw new Error(formatBinaryDiagnostics(error.diagnostics));
      }

      throw error;
    }
  }

  private async extractAudio(
    request: ExecutionAdapterRequest,
    ffmpegPath: string,
    startedAt: number,
  ): Promise<ExecutionAdapterResult> {
    const audioPath = `${request.artifactRoot}/${AUDIO_FILENAME}`;
    await mkdir(dirname(audioPath), { recursive: true });

    const processResult = await runBinaryProcess({
      executablePath: ffmpegPath,
      args: [
        '-y',
        '-i',
        request.videoPath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '16000',
        '-ac',
        '1',
        audioPath,
      ],
    });

    const manifestPath = `${request.artifactRoot}/${AUDIO_MANIFEST_FILENAME}`;
    const sink = request.artifactSink;
    if (sink !== undefined) {
      await sink.writeText(
        manifestPath,
        JSON.stringify(
          {
            adapter: EXECUTION_ADAPTER_KINDS.NATIVE_BINARY,
            nodeKind: request.nodeKind,
            audioPath,
            sampleRate: 16000,
            channels: 1,
            codec: 'pcm_s16le',
            diagnostics: processResult.diagnostics,
          },
          null,
          2,
        ),
      );
    }

    return {
      artifacts: {
        'extract-audio': audioPath,
        'extract-audio-manifest': manifestPath,
      },
      durationMs: Date.now() - startedAt,
    };
  }

  private async generateThumbnail(
    request: ExecutionAdapterRequest,
    ffmpegPath: string,
    startedAt: number,
  ): Promise<ExecutionAdapterResult> {
    const thumbnailPath = `${request.artifactRoot}/${THUMBNAIL_FILENAME}`;
    await mkdir(dirname(thumbnailPath), { recursive: true });
    const timestampSeconds = Number(request.artifacts.__thumbnail_timestamp ?? '0');

    const processResult = await runBinaryProcess({
      executablePath: ffmpegPath,
      args: [
        '-y',
        '-ss',
        String(timestampSeconds),
        '-i',
        request.videoPath,
        '-frames:v',
        '1',
        '-vf',
        `scale=${String(THUMBNAIL_WIDTH)}:${String(THUMBNAIL_HEIGHT)}:force_original_aspect_ratio=increase,crop=${String(THUMBNAIL_WIDTH)}:${String(THUMBNAIL_HEIGHT)}`,
        '-c:v',
        'libwebp',
        thumbnailPath,
      ],
    });

    const manifestPath = `${request.artifactRoot}/${THUMBNAIL_MANIFEST_FILENAME}`;
    const sink = request.artifactSink;
    if (sink !== undefined) {
      await sink.writeText(
        manifestPath,
        JSON.stringify(
          {
            adapter: EXECUTION_ADAPTER_KINDS.NATIVE_BINARY,
            nodeKind: NODE_KINDS.THUMBNAIL,
            thumbnailPath,
            timestampSeconds,
            diagnostics: processResult.diagnostics,
          },
          null,
          2,
        ),
      );
    }

    return {
      artifacts: {
        thumbnail: thumbnailPath,
        'thumbnail-manifest': manifestPath,
      },
      durationMs: Date.now() - startedAt,
    };
  }

  private async mux(
    request: ExecutionAdapterRequest,
    ffmpegPath: string,
    startedAt: number,
  ): Promise<ExecutionAdapterResult> {
    const outputPath = `${request.artifactRoot}/${request.nodeId}-mux.mkv`;
    await mkdir(dirname(outputPath), { recursive: true });

    await runBinaryProcess({
      executablePath: ffmpegPath,
      args: ['-y', '-i', request.videoPath, '-c', 'copy', outputPath],
    });

    return {
      artifacts: { mux: outputPath },
      durationMs: Date.now() - startedAt,
    };
  }
}
