import type { DownloadReport } from './types.js';

export function formatDownloadReportError(report: DownloadReport): string {
  const parts: string[] = [];

  parts.push(`URL: ${report.url}`);
  parts.push(`Provider: ${report.provider}`);

  if (report.httpStatus !== null) {
    parts.push(`HTTP status: ${String(report.httpStatus)}`);
  }

  if (report.responseBody !== null && report.responseBody.length > 0) {
    parts.push(`Response body: ${report.responseBody}`);
  }

  if (
    report.sha256Expected !== null &&
    report.sha256Actual !== null &&
    report.sha256Expected !== report.sha256Actual
  ) {
    parts.push(`Checksum mismatch: expected ${report.sha256Expected}, got ${report.sha256Actual}`);
  }

  if (report.filesystemError !== null) {
    parts.push(`Filesystem error: ${report.filesystemError}`);
  }

  if (report.errorMessage !== null) {
    parts.push(report.errorMessage);
  }

  return parts.join(' · ');
}
