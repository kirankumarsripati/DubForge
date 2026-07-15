import { createWriteStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { MAX_HTTP_REDIRECTS, MAX_RESPONSE_BODY_BYTES } from '../../diagnostics/constants.js';
import type { DownloadProgressUpdate, HttpDownloadOptions } from '../types.js';

const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const PROGRESS_FLUSH_BYTES = 64 * 1024;

export interface HttpDownloadResult {
  readonly bytesDownloaded: number;
  readonly httpStatus: number | null;
  readonly redirectChain: readonly string[];
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly contentLength: number | null;
  readonly mimeType: string | null;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly responseBody: string | null;
}

export class HttpDownloadError extends Error {
  constructor(
    message: string,
    readonly result: HttpDownloadResult,
  ) {
    super(message);
    this.name = 'HttpDownloadError';
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function toAbortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }

  return new Error('Download cancelled');
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(toAbortError(signal));
      return;
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timeout);
      reject(toAbortError(signal));
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

async function readResponseBodySnippet(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    if (text.length === 0) {
      return null;
    }

    if (text.length > MAX_RESPONSE_BODY_BYTES) {
      return `${text.slice(0, MAX_RESPONSE_BODY_BYTES)}...[truncated]`;
    }

    return text;
  } catch {
    return null;
  }
}

function parseTotalBytes(response: Response, resumeFromByte: number): number | null {
  const contentRange = response.headers.get('content-range');
  if (contentRange !== null) {
    const match = /\/(\d+)$/.exec(contentRange);
    if (match?.[1] !== undefined) {
      return Number.parseInt(match[1], 10);
    }
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === null) {
    return null;
  }

  const length = Number.parseInt(contentLength, 10);
  if (Number.isNaN(length)) {
    return null;
  }

  if (response.status === 206) {
    return resumeFromByte + length;
  }

  return length;
}

async function fetchWithRedirectChain(
  url: string,
  init: RequestInit,
): Promise<{ readonly response: Response; readonly redirectChain: readonly string[] }> {
  const redirectChain: string[] = [url];
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_HTTP_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, { ...init, redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location === null) {
        return { response, redirectChain };
      }

      currentUrl = new URL(location, currentUrl).href;
      redirectChain.push(currentUrl);
      continue;
    }

    return { response, redirectChain };
  }

  throw new Error(`Too many redirects while downloading ${url}`);
}

async function writeResponseBody(
  response: Response,
  destinationPath: string,
  resumeFromByte: number,
  totalBytes: number | null,
  onProgress: (update: DownloadProgressUpdate) => void,
  signal: AbortSignal,
): Promise<number> {
  if (response.body === null) {
    throw new Error('Download response did not include a body');
  }

  const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
  const writeStream = createWriteStream(destinationPath, {
    flags: resumeFromByte === 0 ? 'w' : 'a',
  });

  let bytesDownloaded = resumeFromByte;
  let bytesSinceFlush = 0;

  nodeStream.on('data', (chunk: Buffer) => {
    bytesDownloaded += chunk.byteLength;
    bytesSinceFlush += chunk.byteLength;

    if (bytesSinceFlush >= PROGRESS_FLUSH_BYTES) {
      bytesSinceFlush = 0;
      onProgress({ bytesDownloaded, totalBytes });
    }
  });

  const abortHandler = (): void => {
    const abortError = toAbortError(signal);
    nodeStream.destroy(abortError);
    writeStream.destroy(abortError);
  };

  signal.addEventListener('abort', abortHandler, { once: true });

  try {
    await pipeline(nodeStream, writeStream);
  } finally {
    signal.removeEventListener('abort', abortHandler);
  }

  onProgress({ bytesDownloaded, totalBytes });
  return bytesDownloaded;
}

async function fetchWithRange(
  url: string,
  resumeFromByte: number,
  headers: Readonly<Record<string, string>>,
  signal: AbortSignal,
): Promise<{ readonly response: Response; readonly redirectChain: readonly string[] }> {
  const requestHeaders: Record<string, string> = { ...headers };

  if (resumeFromByte > 0) {
    requestHeaders.Range = `bytes=${String(resumeFromByte)}-`;
  }

  return fetchWithRedirectChain(url, { headers: requestHeaders, signal });
}

export async function downloadHttpFile(options: HttpDownloadOptions): Promise<HttpDownloadResult> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const requestHeaders = options.headers ?? {};
  let resumeFromByte = options.resumeFromByte;
  const startedAt = Date.now();

  if (resumeFromByte > 0) {
    const fileStats = await stat(options.destinationPath).catch(() => null);
    if (fileStats?.size !== resumeFromByte) {
      await unlink(options.destinationPath).catch(() => undefined);
      resumeFromByte = 0;
    }
  }

  let lastResult: HttpDownloadResult | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (options.signal.aborted) {
      throw toAbortError(options.signal);
    }

    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), options.signal);
    }

    try {
      let { response, redirectChain } = await fetchWithRange(
        options.url,
        resumeFromByte,
        requestHeaders,
        options.signal,
      );

      if (response.status === 416 && resumeFromByte > 0) {
        await unlink(options.destinationPath).catch(() => undefined);
        resumeFromByte = 0;
        const retried = await fetchWithRange(options.url, 0, requestHeaders, options.signal);
        response = retried.response;
        redirectChain = retried.redirectChain;
      }

      const responseHeaders = headersToRecord(response.headers);
      const mimeType = response.headers.get('content-type');
      const contentLengthHeader = response.headers.get('content-length');
      const contentLength =
        contentLengthHeader === null ? null : Number.parseInt(contentLengthHeader, 10);

      if (!response.ok && response.status !== 206) {
        const responseBody = await readResponseBodySnippet(response);
        const result: HttpDownloadResult = {
          bytesDownloaded: resumeFromByte,
          httpStatus: response.status,
          redirectChain,
          responseHeaders,
          contentLength: Number.isNaN(contentLength ?? Number.NaN) ? null : contentLength,
          mimeType,
          durationMs: Date.now() - startedAt,
          retryCount: attempt,
          responseBody,
        };
        lastResult = result;

        if (isRetryableStatus(response.status) && attempt < maxRetries) {
          continue;
        }

        throw new HttpDownloadError(
          `HTTP ${String(response.status)} while downloading ${options.url}`,
          result,
        );
      }

      const totalBytes = parseTotalBytes(response, resumeFromByte);
      options.onProgress({ bytesDownloaded: resumeFromByte, totalBytes });

      const bytesDownloaded = await writeResponseBody(
        response,
        options.destinationPath,
        resumeFromByte,
        totalBytes,
        options.onProgress,
        options.signal,
      );

      return {
        bytesDownloaded,
        httpStatus: response.status,
        redirectChain,
        responseHeaders,
        contentLength: totalBytes,
        mimeType,
        durationMs: Date.now() - startedAt,
        retryCount: attempt,
        responseBody: null,
      };
    } catch (error) {
      if (error instanceof HttpDownloadError) {
        lastResult = error.result;
        if (attempt >= maxRetries) {
          throw error;
        }
        continue;
      }

      const message = error instanceof Error ? error.message : 'Download failed';
      const result: HttpDownloadResult = {
        bytesDownloaded: resumeFromByte,
        httpStatus: lastResult?.httpStatus ?? null,
        redirectChain: lastResult?.redirectChain ?? [options.url],
        responseHeaders: lastResult?.responseHeaders ?? {},
        contentLength: lastResult?.contentLength ?? null,
        mimeType: lastResult?.mimeType ?? null,
        durationMs: Date.now() - startedAt,
        retryCount: attempt,
        responseBody: lastResult?.responseBody ?? null,
      };
      lastResult = result;

      if (attempt >= maxRetries) {
        throw new HttpDownloadError(message, result);
      }
    }
  }

  throw new HttpDownloadError(
    `HTTP download failed for ${options.url}`,
    lastResult ?? {
      bytesDownloaded: resumeFromByte,
      httpStatus: null,
      redirectChain: [options.url],
      responseHeaders: {},
      contentLength: null,
      mimeType: null,
      durationMs: Date.now() - startedAt,
      retryCount: maxRetries,
      responseBody: null,
    },
  );
}

export async function probeHttpContentLength(
  url: string,
  headers: Readonly<Record<string, string>> = {},
): Promise<number | null> {
  const { response } = await fetchWithRedirectChain(url, { method: 'HEAD', headers });
  if (!response.ok) {
    return null;
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength === null) {
    return null;
  }

  const length = Number.parseInt(contentLength, 10);
  return Number.isNaN(length) ? null : length;
}
