import { createWriteStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { DownloadProgressUpdate, HttpDownloadOptions } from '../types.js';

const DEFAULT_MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;
const PROGRESS_FLUSH_BYTES = 64 * 1024;

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
): Promise<Response> {
  const requestHeaders: Record<string, string> = { ...headers };

  if (resumeFromByte > 0) {
    requestHeaders.Range = `bytes=${String(resumeFromByte)}-`;
  }

  return fetch(url, { headers: requestHeaders, signal });
}

export async function downloadHttpFile(options: HttpDownloadOptions): Promise<number> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const requestHeaders = options.headers ?? {};
  let resumeFromByte = options.resumeFromByte;

  if (resumeFromByte > 0) {
    const fileStats = await stat(options.destinationPath).catch(() => null);
    if (fileStats?.size !== resumeFromByte) {
      await unlink(options.destinationPath).catch(() => undefined);
      resumeFromByte = 0;
    }
  }

  let lastError = new Error('Download failed');

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (options.signal.aborted) {
      throw toAbortError(options.signal);
    }

    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), options.signal);
    }

    try {
      let response = await fetchWithRange(
        options.url,
        resumeFromByte,
        requestHeaders,
        options.signal,
      );

      if (response.status === 416 && resumeFromByte > 0) {
        await unlink(options.destinationPath).catch(() => undefined);
        resumeFromByte = 0;
        response = await fetchWithRange(options.url, 0, requestHeaders, options.signal);
      }

      if (!response.ok && response.status !== 206) {
        if (isRetryableStatus(response.status) && attempt < maxRetries) {
          lastError = new Error(`HTTP ${String(response.status)} while downloading ${options.url}`);
          continue;
        }

        throw new Error(`HTTP ${String(response.status)} while downloading ${options.url}`);
      }

      const totalBytes = parseTotalBytes(response, resumeFromByte);
      options.onProgress({ bytesDownloaded: resumeFromByte, totalBytes });

      return await writeResponseBody(
        response,
        options.destinationPath,
        resumeFromByte,
        totalBytes,
        options.onProgress,
        options.signal,
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Download failed');

      if (attempt >= maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

export async function probeHttpContentLength(
  url: string,
  headers: Readonly<Record<string, string>> = {},
): Promise<number | null> {
  const response = await fetch(url, { method: 'HEAD', headers });
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
