import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '@dubforge/shared';
import { runBinaryProcess } from '@dubforge/platform-execution-adapters';

import { MEDIA_ARTIFACT_FILENAMES } from '../../domain/artifact-names.js';
import type {
  ThumbnailMediaInput,
  ThumbnailMediaPort,
  ThumbnailMediaResult,
} from '../../ports/media-ports.js';

export {
  BinaryProcessError as ProcessExecutionError,
  formatBinaryDiagnostics as formatProcessDiagnostics,
  type BinaryProcessDiagnostics as ProcessExecutionDiagnostics,
} from '@dubforge/platform-execution-adapters';

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
      '-c:v',
      'libwebp',
      thumbnailPath,
    ];

    const result = await runBinaryProcess({
      executablePath: this.options.ffmpegPath,
      args,
    });

    const durationMs = Date.now() - startedAt;
    const artifactPath = `${input.artifactRoot}/${MEDIA_ARTIFACT_FILENAMES.THUMBNAIL_MANIFEST}`;

    return {
      thumbnailPath,
      artifactPath,
      durationMs,
      diagnostics: result.diagnostics,
      timestampSeconds: input.timestampSeconds,
    };
  }
}
