import { copyFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { DOWNLOAD_SOURCE_TYPES } from '../source-types.js';
import type {
  DownloadExecutionContext,
  DownloadProvider,
  DownloadProviderAttemptResult,
  DownloadSource,
} from '../types.js';

function resolveLocalPath(url: string): string {
  if (url.startsWith('file://')) {
    return fileURLToPath(url);
  }

  return url;
}

export class LocalFileDownloadProvider implements DownloadProvider {
  readonly type = DOWNLOAD_SOURCE_TYPES.LOCAL_FILE;

  canHandle(source: DownloadSource): boolean {
    return source.type === DOWNLOAD_SOURCE_TYPES.LOCAL_FILE;
  }

  async probeTotalBytes(source: DownloadSource): Promise<number | null> {
    const filePath = resolveLocalPath(source.url);
    const fileStats = await stat(filePath);
    return fileStats.size;
  }

  async download(
    source: DownloadSource,
    context: DownloadExecutionContext,
  ): Promise<DownloadProviderAttemptResult> {
    const startedAt = Date.now();
    const filePath = resolveLocalPath(source.url);

    try {
      const fileStats = await stat(filePath);
      const totalBytes = fileStats.size;

      context.onProgress({ bytesDownloaded: 0, totalBytes });
      await copyFile(filePath, context.tempPath);
      context.onProgress({ bytesDownloaded: totalBytes, totalBytes });

      return {
        url: source.url,
        provider: this.type,
        redirectChain: [source.url],
        httpStatus: null,
        responseHeaders: {},
        contentLength: totalBytes,
        downloadedSizeBytes: totalBytes,
        mimeType: null,
        durationMs: Date.now() - startedAt,
        retryCount: 0,
        responseBody: null,
        filesystemError: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Local file copy failed';
      return {
        url: source.url,
        provider: this.type,
        redirectChain: [source.url],
        httpStatus: null,
        responseHeaders: {},
        contentLength: null,
        downloadedSizeBytes: 0,
        mimeType: null,
        durationMs: Date.now() - startedAt,
        retryCount: 0,
        responseBody: null,
        filesystemError: message,
      };
    }
  }
}
