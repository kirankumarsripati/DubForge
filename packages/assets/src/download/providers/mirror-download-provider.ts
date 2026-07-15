import { DOWNLOAD_SOURCE_TYPES } from '../source-types.js';
import { downloadHttpFile, probeHttpContentLength } from '../http/http-downloader.js';
import type { DownloadExecutionContext, DownloadProvider, DownloadSource } from '../types.js';

const DEFAULT_MAX_RETRIES = 3;

function isHttpUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

export class MirrorDownloadProvider implements DownloadProvider {
  readonly type = DOWNLOAD_SOURCE_TYPES.MIRROR;

  canHandle(source: DownloadSource): boolean {
    return source.type === DOWNLOAD_SOURCE_TYPES.MIRROR && isHttpUrl(source.url);
  }

  probeTotalBytes(source: DownloadSource): Promise<number | null> {
    return probeHttpContentLength(source.url, source.headers ?? {});
  }

  async download(source: DownloadSource, context: DownloadExecutionContext): Promise<void> {
    await downloadHttpFile({
      url: source.url,
      destinationPath: context.tempPath,
      resumeFromByte: context.resumeFromByte,
      signal: context.signal,
      headers: source.headers,
      maxRetries: DEFAULT_MAX_RETRIES,
      onProgress: context.onProgress,
    });
  }
}
