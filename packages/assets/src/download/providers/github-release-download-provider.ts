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
const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

function isGitHubReleaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return GITHUB_HOSTS.has(parsed.hostname) && parsed.pathname.includes('/releases/download/');
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

export class GitHubReleaseDownloadProvider implements DownloadProvider {
  readonly type = DOWNLOAD_SOURCE_TYPES.GITHUB_RELEASE;

  canHandle(source: DownloadSource): boolean {
    return source.type === DOWNLOAD_SOURCE_TYPES.GITHUB_RELEASE && isGitHubReleaseUrl(source.url);
  }

  probeTotalBytes(source: DownloadSource): Promise<number | null> {
    return probeHttpContentLength(source.url, {
      Accept: 'application/octet-stream',
      ...source.headers,
    });
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
        headers: {
          Accept: 'application/octet-stream',
          ...source.headers,
        },
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
