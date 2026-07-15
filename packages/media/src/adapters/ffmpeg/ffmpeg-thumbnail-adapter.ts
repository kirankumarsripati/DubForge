import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '@dubforge/shared';

import { ProcessExecutionError, runProcess } from '../subprocess/process-execution.js';
import type {
  ThumbnailMediaInput,
  ThumbnailMediaPort,
  ThumbnailMediaResult,
} from '../../ports/media-ports.js';

export interface FfmpegThumbnailAdapterOptions {
  readonly ffmpegPath: string;
}

export class FfmpegThumbnailAdapter implements ThumbnailMediaPort {
  constructor(private readonly options: FfmpegThumbnailAdapterOptions) {}

  async generate(input: ThumbnailMediaInput): Promise<ThumbnailMediaResult> {
    const startedAt = Date.now();
    const thumbnailPath = input.outputPath;
    await mkdir(dirname(thumbnailPath), { recursive: true });

    const args = [
      '-y',
      '-ss',
      String(input.timestampSeconds),
      '-i',
      input.filePath,
      '-frames:v',
      '1',
      '-vf',
      `scale=${String(THUMBNAIL_WIDTH)}:${String(THUMBNAIL_HEIGHT)}:force_original_aspect_ratio=increase,crop=${String(THUMBNAIL_WIDTH)}:${String(THUMBNAIL_HEIGHT)}`,
      thumbnailPath,
    ];

    let diagnostics;
    try {
      const result = await runProcess({
        executablePath: this.options.ffmpegPath,
        args,
      });
      diagnostics = result.diagnostics;
    } catch (error) {
      if (error instanceof ProcessExecutionError) {
        throw error;
      }

      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${input.nodeId}-thumbnail.json`;

    return {
      thumbnailPath,
      artifactPath,
      durationMs,
      diagnostics,
      timestampSeconds: input.timestampSeconds,
    };
  }
}
