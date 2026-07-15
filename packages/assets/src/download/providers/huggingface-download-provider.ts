import { DOWNLOAD_SOURCE_TYPES } from '../source-types.js';
import { downloadHttpFile, probeHttpContentLength } from '../http/http-downloader.js';
import type { DownloadExecutionContext, DownloadProvider, DownloadSource } from '../types.js';

const DEFAULT_MAX_RETRIES = 3;
const HUGGINGFACE_HOSTS = new Set(['huggingface.co', 'www.huggingface.co']);

function isHuggingFaceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return HUGGINGFACE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export class HuggingFaceDownloadProvider implements DownloadProvider {
  readonly type = DOWNLOAD_SOURCE_TYPES.HUGGINGFACE;

  canHandle(source: DownloadSource): boolean {
    return source.type === DOWNLOAD_SOURCE_TYPES.HUGGINGFACE && isHuggingFaceUrl(source.url);
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
