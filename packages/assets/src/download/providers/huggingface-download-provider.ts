import { DOWNLOAD_SOURCE_TYPES } from '../source-types.js';
import {
  downloadHttpFile,
  HttpDownloadError,
  probeHttpContentLength,
} from '../http/http-downloader.js';
import type {
  DownloadExecutionContext,
  DownloadProvider,
  DownloadProviderAttemptResult,
  DownloadSource,
} from '../types.js';

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

function toAttemptResult(
  source: DownloadSource,
  provider: string,
  result: {
    readonly bytesDownloaded: number;
    readonly httpStatus: number | null;
    readonly redirectChain: readonly string[];
    readonly responseHeaders: Readonly<Record<string, string>>;
    readonly contentLength: number | null;
    readonly mimeType: string | null;
    readonly durationMs: number;
    readonly retryCount: number;
    readonly responseBody: string | null;
  },
): DownloadProviderAttemptResult {
  return {
    url: source.url,
    provider,
    redirectChain: result.redirectChain,
    httpStatus: result.httpStatus,
    responseHeaders: result.responseHeaders,
    contentLength: result.contentLength,
    downloadedSizeBytes: result.bytesDownloaded,
    mimeType: result.mimeType,
    durationMs: result.durationMs,
    retryCount: result.retryCount,
    responseBody: result.responseBody,
    filesystemError: null,
  };
}

export class HuggingFaceDownloadProvider implements DownloadProvider {
  readonly type = DOWNLOAD_SOURCE_TYPES.HUGGINGFACE;

  canHandle(source: DownloadSource): boolean {
    return source.type === DOWNLOAD_SOURCE_TYPES.HUGGINGFACE && isHuggingFaceUrl(source.url);
  }

  probeTotalBytes(source: DownloadSource): Promise<number | null> {
    return probeHttpContentLength(source.url, source.headers ?? {});
  }

  async download(
    source: DownloadSource,
    context: DownloadExecutionContext,
  ): Promise<DownloadProviderAttemptResult> {
    const startedAt = Date.now();

    try {
      const result = await downloadHttpFile({
        url: source.url,
        destinationPath: context.tempPath,
        resumeFromByte: context.resumeFromByte,
        signal: context.signal,
        headers: source.headers,
        maxRetries: DEFAULT_MAX_RETRIES,
        onProgress: context.onProgress,
      });

      return toAttemptResult(source, this.type, result);
    } catch (error) {
      if (error instanceof HttpDownloadError) {
        return toAttemptResult(source, this.type, error.result);
      }

      const message = error instanceof Error ? error.message : 'HTTP download failed';
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
