import type { VerificationCheckCode } from './constants.js';

export interface VerificationCheckStep {
  readonly code: VerificationCheckCode;
  readonly passed: boolean;
  readonly message: string;
  readonly durationMs: number;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;
}

export interface VerificationReport {
  readonly id: string;
  readonly assetId: string;
  readonly valid: boolean;
  readonly steps: readonly VerificationCheckStep[];
  readonly checkedAt: string;
  readonly durationMs: number;
}

export interface DownloadReport {
  readonly id: string;
  readonly downloadId: string;
  readonly assetId: string;
  readonly url: string;
  readonly provider: string;
  readonly redirectChain: readonly string[];
  readonly httpStatus: number | null;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly contentLength: number | null;
  readonly expectedSizeBytes: number | null;
  readonly downloadedSizeBytes: number;
  readonly sha256Expected: string | null;
  readonly sha256Actual: string | null;
  readonly mimeType: string | null;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly success: boolean;
  readonly errorMessage: string | null;
  readonly responseBody: string | null;
  readonly filesystemError: string | null;
  readonly createdAt: string;
}

export interface CreateDownloadReportInput {
  readonly downloadId: string;
  readonly assetId: string;
  readonly url: string;
  readonly provider: string;
  readonly redirectChain: readonly string[];
  readonly httpStatus: number | null;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly contentLength: number | null;
  readonly expectedSizeBytes: number | null;
  readonly downloadedSizeBytes: number;
  readonly sha256Expected: string | null;
  readonly sha256Actual: string | null;
  readonly mimeType: string | null;
  readonly durationMs: number;
  readonly retryCount: number;
  readonly success: boolean;
  readonly errorMessage: string | null;
  readonly responseBody: string | null;
  readonly filesystemError: string | null;
}

export interface AssetDiagnostics {
  readonly assetId: string;
  readonly downloadReports: readonly DownloadReport[];
  readonly verificationReports: readonly VerificationReport[];
  readonly latestVerification: VerificationReport | null;
}
