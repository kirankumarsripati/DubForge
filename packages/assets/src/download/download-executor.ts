import { rename, stat, unlink } from 'node:fs/promises';

import type { DiagnosticsRepository } from '../diagnostics/diagnostics-repository.js';
import { formatDownloadReportError } from '../diagnostics/format-errors.js';
import type { CreateDownloadReportInput, DownloadReport } from '../diagnostics/types.js';
import { hashFileSha256 } from '../verification/file-hash.js';
import type { DownloadProviderRegistry } from './download-provider-registry.js';
import type {
  AssetDownloadManifest,
  DownloadProviderAttemptResult,
  DownloadSource,
} from './types.js';

export { hashFileSha256 } from '../verification/file-hash.js';

export async function verifyDownloadedFile(
  filePath: string,
  expectedChecksum: string | null,
): Promise<string> {
  const actualChecksum = await hashFileSha256(filePath);

  if (expectedChecksum !== null && actualChecksum !== expectedChecksum) {
    throw new Error(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
  }

  return actualChecksum;
}

export async function atomicRenameVerifiedFile(
  tempPath: string,
  finalPath: string,
  expectedChecksum: string | null,
): Promise<{ readonly checksum: string; readonly sizeBytes: number }> {
  const checksum = await verifyDownloadedFile(tempPath, expectedChecksum);
  const fileStats = await stat(tempPath);

  await rename(tempPath, finalPath);

  return {
    checksum,
    sizeBytes: fileStats.size,
  };
}

export async function resolveResumeOffset(tempPath: string): Promise<number> {
  const fileStats = await stat(tempPath).catch(() => null);
  return fileStats?.size ?? 0;
}

function buildDownloadReportInput(input: {
  readonly downloadId: string;
  readonly assetId: string;
  readonly attempt: DownloadProviderAttemptResult;
  readonly expectedSizeBytes: number | null;
  readonly sha256Expected: string | null;
  readonly sha256Actual: string | null;
  readonly success: boolean;
  readonly errorMessage: string | null;
}): CreateDownloadReportInput {
  return {
    downloadId: input.downloadId,
    assetId: input.assetId,
    url: input.attempt.url,
    provider: input.attempt.provider,
    redirectChain: input.attempt.redirectChain,
    httpStatus: input.attempt.httpStatus,
    responseHeaders: input.attempt.responseHeaders,
    contentLength: input.attempt.contentLength,
    expectedSizeBytes: input.expectedSizeBytes,
    downloadedSizeBytes: input.attempt.downloadedSizeBytes,
    sha256Expected: input.sha256Expected,
    sha256Actual: input.sha256Actual,
    mimeType: input.attempt.mimeType,
    durationMs: input.attempt.durationMs,
    retryCount: input.attempt.retryCount,
    success: input.success,
    errorMessage: input.errorMessage,
    responseBody: input.attempt.responseBody,
    filesystemError: input.attempt.filesystemError,
  };
}

function isAttemptTransportFailure(attempt: DownloadProviderAttemptResult): boolean {
  if (attempt.filesystemError !== null) {
    return true;
  }

  if (attempt.httpStatus !== null && attempt.httpStatus >= 400) {
    return true;
  }

  return attempt.downloadedSizeBytes === 0;
}

export async function downloadFromManifestSources(input: {
  readonly manifest: AssetDownloadManifest;
  readonly registry: DownloadProviderRegistry;
  readonly tempPath: string;
  readonly assetId: string;
  readonly version: string;
  readonly downloadId: string;
  readonly expectedSizeBytes: number | null;
  readonly diagnosticsRepository: DiagnosticsRepository;
  readonly signal: AbortSignal;
  readonly onProgress: (bytesDownloaded: number, totalBytes: number | null) => void;
}): Promise<DownloadReport> {
  if (input.manifest.sources.length === 0) {
    throw new Error(`Asset ${input.assetId} does not declare any download sources`);
  }

  const resumeFromByte = await resolveResumeOffset(input.tempPath);
  const sha256Expected = input.manifest.checksum;
  let lastReport: DownloadReport | null = null;

  for (const source of input.manifest.sources) {
    const provider = input.registry.resolve(source);
    if (provider === null) {
      const report = input.diagnosticsRepository.insertDownloadReport(
        buildDownloadReportInput({
          downloadId: input.downloadId,
          assetId: input.assetId,
          attempt: {
            url: source.url,
            provider: source.type,
            redirectChain: [source.url],
            httpStatus: null,
            responseHeaders: {},
            contentLength: null,
            downloadedSizeBytes: 0,
            mimeType: null,
            durationMs: 0,
            retryCount: 0,
            responseBody: null,
            filesystemError: null,
          },
          expectedSizeBytes: input.expectedSizeBytes,
          sha256Expected,
          sha256Actual: null,
          success: false,
          errorMessage: `No provider registered for source type: ${source.type}`,
        }),
      );
      lastReport = report;
      continue;
    }

    let attempt: DownloadProviderAttemptResult;
    try {
      attempt = await provider.download(source, {
        assetId: input.assetId,
        version: input.version,
        tempPath: input.tempPath,
        resumeFromByte,
        signal: input.signal,
        onProgress: (update) => {
          input.onProgress(update.bytesDownloaded, update.totalBytes);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download attempt failed';
      const report = input.diagnosticsRepository.insertDownloadReport(
        buildDownloadReportInput({
          downloadId: input.downloadId,
          assetId: input.assetId,
          attempt: {
            url: source.url,
            provider: source.type,
            redirectChain: [source.url],
            httpStatus: null,
            responseHeaders: {},
            contentLength: null,
            downloadedSizeBytes: 0,
            mimeType: null,
            durationMs: 0,
            retryCount: 0,
            responseBody: null,
            filesystemError: message,
          },
          expectedSizeBytes: input.expectedSizeBytes,
          sha256Expected,
          sha256Actual: null,
          success: false,
          errorMessage: message,
        }),
      );
      lastReport = report;
      await unlink(input.tempPath).catch(() => undefined);
      continue;
    }

    if (isAttemptTransportFailure(attempt)) {
      const errorMessage =
        attempt.filesystemError ??
        (attempt.httpStatus !== null
          ? `HTTP ${String(attempt.httpStatus)} while downloading ${attempt.url}`
          : 'Download returned zero bytes');
      const report = input.diagnosticsRepository.insertDownloadReport(
        buildDownloadReportInput({
          downloadId: input.downloadId,
          assetId: input.assetId,
          attempt,
          expectedSizeBytes: input.expectedSizeBytes,
          sha256Expected,
          sha256Actual: null,
          success: false,
          errorMessage,
        }),
      );
      lastReport = report;
      await unlink(input.tempPath).catch(() => undefined);
      continue;
    }

    let sha256Actual: string;
    try {
      sha256Actual = await hashFileSha256(input.tempPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checksum computation failed';
      const report = input.diagnosticsRepository.insertDownloadReport(
        buildDownloadReportInput({
          downloadId: input.downloadId,
          assetId: input.assetId,
          attempt,
          expectedSizeBytes: input.expectedSizeBytes,
          sha256Expected,
          sha256Actual: null,
          success: false,
          errorMessage: message,
        }),
      );
      lastReport = report;
      await unlink(input.tempPath).catch(() => undefined);
      continue;
    }

    if (sha256Expected !== null && sha256Actual !== sha256Expected) {
      const errorMessage = `Checksum mismatch: expected ${sha256Expected}, got ${sha256Actual}`;
      const report = input.diagnosticsRepository.insertDownloadReport(
        buildDownloadReportInput({
          downloadId: input.downloadId,
          assetId: input.assetId,
          attempt,
          expectedSizeBytes: input.expectedSizeBytes,
          sha256Expected,
          sha256Actual,
          success: false,
          errorMessage,
        }),
      );
      lastReport = report;
      await unlink(input.tempPath).catch(() => undefined);
      continue;
    }

    const report = input.diagnosticsRepository.insertDownloadReport(
      buildDownloadReportInput({
        downloadId: input.downloadId,
        assetId: input.assetId,
        attempt,
        expectedSizeBytes: input.expectedSizeBytes,
        sha256Expected,
        sha256Actual,
        success: true,
        errorMessage: null,
      }),
    );

    return report;
  }

  if (lastReport !== null) {
    throw new Error(formatDownloadReportError(lastReport));
  }

  throw new Error(`Asset ${input.assetId} does not declare any usable download sources`);
}

export async function probeManifestTotalBytes(
  sources: readonly DownloadSource[],
  registry: DownloadProviderRegistry,
): Promise<number | null> {
  for (const source of sources) {
    const provider = registry.resolve(source);
    if (provider?.probeTotalBytes === undefined) {
      continue;
    }

    const totalBytes = await provider.probeTotalBytes(source);
    if (totalBytes !== null) {
      return totalBytes;
    }
  }

  return null;
}
