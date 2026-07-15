import { copyFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { DOWNLOAD_SOURCE_TYPES } from '../source-types.js';
import type { DownloadExecutionContext, DownloadProvider, DownloadSource } from '../types.js';

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

  async download(source: DownloadSource, context: DownloadExecutionContext): Promise<void> {
    const filePath = resolveLocalPath(source.url);
    const fileStats = await stat(filePath);
    const totalBytes = fileStats.size;

    context.onProgress({ bytesDownloaded: 0, totalBytes });
    await copyFile(filePath, context.tempPath);
    context.onProgress({ bytesDownloaded: totalBytes, totalBytes });
  }
}
