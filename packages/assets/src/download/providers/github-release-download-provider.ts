import { DOWNLOAD_SOURCE_TYPES } from '../source-types.js';
import { downloadHttpFile, probeHttpContentLength } from '../http/http-downloader.js';
import type { DownloadExecutionContext, DownloadProvider, DownloadSource } from '../types.js';

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

  async download(source: DownloadSource, context: DownloadExecutionContext): Promise<void> {
    await downloadHttpFile({
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
  }
}
