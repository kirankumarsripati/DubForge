import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import type {
  AssetDiagnostics,
  CreateDownloadReportInput,
  DownloadReport,
  VerificationCheckStep,
  VerificationReport,
} from './types.js';

interface DownloadReportRow {
  readonly id: string;
  readonly downloadId: string;
  readonly assetId: string;
  readonly url: string;
  readonly provider: string;
  readonly redirectChainJson: string;
  readonly httpStatus: number | null;
  readonly responseHeadersJson: string;
  readonly contentLength: number | null;
  readonly expectedSizeBytes: number | null;
  readonly downloadedSizeBytes: number;
  readonly sha256Expected: string | null;
  readonly sha256Actual: string | null;
  readonly mimeType: string | null;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly success: number;
  readonly errorMessage: string | null;
  readonly responseBody: string | null;
  readonly filesystemError: string | null;
  readonly createdAt: string;
}

interface VerificationReportRow {
  readonly id: string;
  readonly assetId: string;
  readonly valid: number;
  readonly stepsJson: string;
  readonly checkedAt: string;
  readonly durationMs: number;
}

function mapDownloadReportRow(row: DownloadReportRow): DownloadReport {
  return {
    id: row.id,
    downloadId: row.downloadId,
    assetId: row.assetId,
    url: row.url,
    provider: row.provider,
    redirectChain: JSON.parse(row.redirectChainJson) as string[],
    httpStatus: row.httpStatus,
    responseHeaders: JSON.parse(row.responseHeadersJson) as Record<string, string>,
    contentLength: row.contentLength,
    expectedSizeBytes: row.expectedSizeBytes,
    downloadedSizeBytes: row.downloadedSizeBytes,
    sha256Expected: row.sha256Expected,
    sha256Actual: row.sha256Actual,
    mimeType: row.mimeType,
    durationMs: row.durationMs,
    retryCount: row.retryCount,
    success: row.success === 1,
    errorMessage: row.errorMessage,
    responseBody: row.responseBody,
    filesystemError: row.filesystemError,
    createdAt: row.createdAt,
  };
}

function mapVerificationReportRow(row: VerificationReportRow): VerificationReport {
  return {
    id: row.id,
    assetId: row.assetId,
    valid: row.valid === 1,
    steps: JSON.parse(row.stepsJson) as VerificationCheckStep[],
    checkedAt: row.checkedAt,
    durationMs: row.durationMs,
  };
}

export class DiagnosticsRepository {
  private readonly insertDownloadReportStatement: Database.Statement;
  private readonly selectDownloadReportsByAsset: Database.Statement;
  private readonly insertVerificationReportStatement: Database.Statement;
  private readonly selectVerificationReportsByAsset: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertDownloadReportStatement = db.prepare(`
      INSERT INTO download_reports (
        id, download_id, asset_id, url, provider, redirect_chain_json, http_status,
        response_headers_json, content_length, expected_size_bytes, downloaded_size_bytes,
        sha256_expected, sha256_actual, mime_type, duration_ms, retry_count, success,
        error_message, response_body, filesystem_error, created_at
      ) VALUES (
        @id, @downloadId, @assetId, @url, @provider, @redirectChainJson, @httpStatus,
        @responseHeadersJson, @contentLength, @expectedSizeBytes, @downloadedSizeBytes,
        @sha256Expected, @sha256Actual, @mimeType, @durationMs, @retryCount, @success,
        @errorMessage, @responseBody, @filesystemError, @createdAt
      )
    `);

    this.selectDownloadReportsByAsset = db.prepare(`
      SELECT
        id, download_id AS downloadId, asset_id AS assetId, url, provider,
        redirect_chain_json AS redirectChainJson, http_status AS httpStatus,
        response_headers_json AS responseHeadersJson, content_length AS contentLength,
        expected_size_bytes AS expectedSizeBytes, downloaded_size_bytes AS downloadedSizeBytes,
        sha256_expected AS sha256Expected, sha256_actual AS sha256Actual, mime_type AS mimeType,
        duration_ms AS durationMs, retry_count AS retryCount, success, error_message AS errorMessage,
        response_body AS responseBody, filesystem_error AS filesystemError, created_at AS createdAt
      FROM download_reports
      WHERE asset_id = ?
      ORDER BY created_at DESC
    `);

    this.insertVerificationReportStatement = db.prepare(`
      INSERT INTO verification_reports (
        id, asset_id, valid, steps_json, checked_at, duration_ms
      ) VALUES (
        @id, @assetId, @valid, @stepsJson, @checkedAt, @durationMs
      )
    `);

    this.selectVerificationReportsByAsset = db.prepare(`
      SELECT
        id, asset_id AS assetId, valid, steps_json AS stepsJson,
        checked_at AS checkedAt, duration_ms AS durationMs
      FROM verification_reports
      WHERE asset_id = ?
      ORDER BY checked_at DESC
    `);
  }

  insertDownloadReport(input: CreateDownloadReportInput): DownloadReport {
    const createdAt = new Date().toISOString();
    const report: DownloadReport = {
      id: randomUUID(),
      downloadId: input.downloadId,
      assetId: input.assetId,
      url: input.url,
      provider: input.provider,
      redirectChain: [...input.redirectChain],
      httpStatus: input.httpStatus,
      responseHeaders: input.responseHeaders,
      contentLength: input.contentLength,
      expectedSizeBytes: input.expectedSizeBytes,
      downloadedSizeBytes: input.downloadedSizeBytes,
      sha256Expected: input.sha256Expected,
      sha256Actual: input.sha256Actual,
      mimeType: input.mimeType,
      durationMs: input.durationMs,
      retryCount: input.retryCount,
      success: input.success,
      errorMessage: input.errorMessage,
      responseBody: input.responseBody,
      filesystemError: input.filesystemError,
      createdAt,
    };

    this.insertDownloadReportStatement.run({
      id: report.id,
      downloadId: report.downloadId,
      assetId: report.assetId,
      url: report.url,
      provider: report.provider,
      redirectChainJson: JSON.stringify(report.redirectChain),
      httpStatus: report.httpStatus,
      responseHeadersJson: JSON.stringify(report.responseHeaders),
      contentLength: report.contentLength,
      expectedSizeBytes: report.expectedSizeBytes,
      downloadedSizeBytes: report.downloadedSizeBytes,
      sha256Expected: report.sha256Expected,
      sha256Actual: report.sha256Actual,
      mimeType: report.mimeType,
      durationMs: report.durationMs,
      retryCount: report.retryCount,
      success: report.success ? 1 : 0,
      errorMessage: report.errorMessage,
      responseBody: report.responseBody,
      filesystemError: report.filesystemError,
      createdAt: report.createdAt,
    });

    return report;
  }

  listDownloadReportsByAsset(assetId: string): readonly DownloadReport[] {
    const rows = this.selectDownloadReportsByAsset.all(assetId) as DownloadReportRow[];
    return rows.map(mapDownloadReportRow);
  }

  insertVerificationReport(input: {
    readonly assetId: string;
    readonly valid: boolean;
    readonly steps: readonly VerificationCheckStep[];
    readonly checkedAt: string;
    readonly durationMs: number;
  }): VerificationReport {
    const report: VerificationReport = {
      id: randomUUID(),
      assetId: input.assetId,
      valid: input.valid,
      steps: [...input.steps],
      checkedAt: input.checkedAt,
      durationMs: input.durationMs,
    };

    this.insertVerificationReportStatement.run({
      id: report.id,
      assetId: report.assetId,
      valid: report.valid ? 1 : 0,
      stepsJson: JSON.stringify(report.steps),
      checkedAt: report.checkedAt,
      durationMs: report.durationMs,
    });

    return report;
  }

  listVerificationReportsByAsset(assetId: string): readonly VerificationReport[] {
    const rows = this.selectVerificationReportsByAsset.all(assetId) as VerificationReportRow[];
    return rows.map(mapVerificationReportRow);
  }

  getAssetDiagnostics(assetId: string): AssetDiagnostics {
    const downloadReports = this.listDownloadReportsByAsset(assetId);
    const verificationReports = this.listVerificationReportsByAsset(assetId);

    return {
      assetId,
      downloadReports,
      verificationReports,
      latestVerification: verificationReports[0] ?? null,
    };
  }
}
