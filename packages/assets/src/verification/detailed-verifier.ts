import { access, constants, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';

import type { DiagnosticsRepository } from '../diagnostics/diagnostics-repository.js';
import { VERIFICATION_CHECK_CODES } from '../diagnostics/constants.js';
import type { VerificationCheckStep, VerificationReport } from '../diagnostics/types.js';
import type { AssetHealthService } from '../health/asset-health.js';
import type { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES } from '../types.js';
import type { AssetRecord } from '../types.js';
import { hashFileSha256 } from './file-hash.js';

export interface DetailedVerificationResult {
  readonly report: VerificationReport;
  readonly valid: boolean;
}

export class DetailedAssetVerifier {
  constructor(
    private readonly repository: AssetRepository,
    private readonly diagnosticsRepository: DiagnosticsRepository,
    private readonly healthService: AssetHealthService,
  ) {}

  async verifyAsset(assetId: string): Promise<DetailedVerificationResult> {
    const startedAt = Date.now();
    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      return this.persistReport(assetId, startedAt, [
        this.failedStep(VERIFICATION_CHECK_CODES.EXISTS, 'Asset metadata not found', startedAt, {}),
      ]);
    }

    return this.verifyRecordWithStart(asset, startedAt);
  }

  async verifyRecord(asset: AssetRecord): Promise<DetailedVerificationResult> {
    return this.verifyRecordWithStart(asset, Date.now());
  }

  private async verifyRecordWithStart(
    asset: AssetRecord,
    startedAt: number,
  ): Promise<DetailedVerificationResult> {
    const steps: VerificationCheckStep[] = [];

    const existsStep = await this.checkExists(asset, startedAt);
    steps.push(existsStep);
    if (!existsStep.passed) {
      return this.persistReport(asset.id, startedAt, steps);
    }

    const filePath = asset.filePath;
    if (filePath === null) {
      return this.persistReport(asset.id, startedAt, steps);
    }

    const sizeStep = await this.checkSize(asset, filePath, startedAt);
    steps.push(sizeStep);

    const sha256Step = await this.checkSha256(asset, filePath, startedAt);
    steps.push(sha256Step);
    if (!sha256Step.passed && sha256Step.details.actual !== null) {
      this.repository.updateAssetMetadata(asset.id, { status: ASSET_STATUSES.CORRUPTED });
    }

    const permissionsStep = await this.checkPermissions(filePath, startedAt);
    steps.push(permissionsStep);

    const readableStep = await this.checkReadable(filePath, startedAt);
    steps.push(readableStep);

    const healthyStep = await this.checkHealthy(asset.id, startedAt);
    steps.push(healthyStep);

    const allPassed = steps.every((step) => step.passed);
    if (allPassed && asset.status === ASSET_STATUSES.CORRUPTED) {
      this.repository.updateAssetMetadata(asset.id, { status: ASSET_STATUSES.READY });
    }

    return this.persistReport(asset.id, startedAt, steps);
  }

  private async checkExists(asset: AssetRecord, startedAt: number): Promise<VerificationCheckStep> {
    const stepStartedAt = Date.now();

    if (asset.filePath === null) {
      return this.failedStep(
        VERIFICATION_CHECK_CODES.EXISTS,
        'Binary path not set in metadata',
        stepStartedAt,
        { filePath: null },
      );
    }

    try {
      await access(asset.filePath);
      return this.passedStep(VERIFICATION_CHECK_CODES.EXISTS, 'Binary file exists', stepStartedAt, {
        filePath: asset.filePath,
        elapsedSinceStartMs: stepStartedAt - startedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Binary file missing on filesystem';
      return this.failedStep(VERIFICATION_CHECK_CODES.EXISTS, message, stepStartedAt, {
        filePath: asset.filePath,
      });
    }
  }

  private async checkSize(
    asset: AssetRecord,
    filePath: string,
    startedAt: number,
  ): Promise<VerificationCheckStep> {
    const stepStartedAt = Date.now();

    try {
      const fileStats = await stat(filePath);
      const expectedSizeBytes = asset.sizeBytes;
      const actualSizeBytes = fileStats.size;

      if (expectedSizeBytes !== null && actualSizeBytes !== expectedSizeBytes) {
        return this.failedStep(
          VERIFICATION_CHECK_CODES.SIZE,
          `Size mismatch: expected ${String(expectedSizeBytes)} bytes, got ${String(actualSizeBytes)} bytes`,
          stepStartedAt,
          {
            expectedSizeBytes,
            actualSizeBytes,
            elapsedSinceStartMs: stepStartedAt - startedAt,
          },
        );
      }

      return this.passedStep(
        VERIFICATION_CHECK_CODES.SIZE,
        'File size matches metadata',
        stepStartedAt,
        {
          expectedSizeBytes,
          actualSizeBytes,
          elapsedSinceStartMs: stepStartedAt - startedAt,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read file size';
      return this.failedStep(VERIFICATION_CHECK_CODES.SIZE, message, stepStartedAt, {
        filePath,
      });
    }
  }

  private async checkSha256(
    asset: AssetRecord,
    filePath: string,
    startedAt: number,
  ): Promise<VerificationCheckStep> {
    const stepStartedAt = Date.now();

    try {
      const actual = await hashFileSha256(filePath);
      const expected = asset.checksum;

      if (expected !== null && actual !== expected) {
        return this.failedStep(
          VERIFICATION_CHECK_CODES.SHA256,
          `Checksum mismatch: expected ${expected}, got ${actual}`,
          stepStartedAt,
          {
            expected,
            actual,
            elapsedSinceStartMs: stepStartedAt - startedAt,
          },
        );
      }

      return this.passedStep(
        VERIFICATION_CHECK_CODES.SHA256,
        'SHA-256 checksum matches',
        stepStartedAt,
        {
          expected,
          actual,
          elapsedSinceStartMs: stepStartedAt - startedAt,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checksum verification failed';
      return this.failedStep(VERIFICATION_CHECK_CODES.SHA256, message, stepStartedAt, {
        expected: asset.checksum,
        actual: null,
      });
    }
  }

  private async checkPermissions(
    filePath: string,
    startedAt: number,
  ): Promise<VerificationCheckStep> {
    const stepStartedAt = Date.now();

    try {
      await access(filePath, constants.R_OK);
      const fileStats = await stat(filePath);
      const mode = fileStats.mode & 0o777;

      return this.passedStep(
        VERIFICATION_CHECK_CODES.PERMISSIONS,
        'File permissions allow read access',
        stepStartedAt,
        {
          mode: `0${mode.toString(8)}`,
          elapsedSinceStartMs: stepStartedAt - startedAt,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Insufficient file permissions';
      return this.failedStep(VERIFICATION_CHECK_CODES.PERMISSIONS, message, stepStartedAt, {
        filePath,
      });
    }
  }

  private async checkReadable(filePath: string, startedAt: number): Promise<VerificationCheckStep> {
    const stepStartedAt = Date.now();

    try {
      await new Promise<void>((resolve, reject) => {
        const stream = createReadStream(filePath, { start: 0, end: 0 });
        stream.on('error', reject);
        stream.on('end', () => {
          resolve();
        });
      });

      return this.passedStep(
        VERIFICATION_CHECK_CODES.READABLE,
        'File is readable from disk',
        stepStartedAt,
        {
          filePath,
          elapsedSinceStartMs: stepStartedAt - startedAt,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'File is not readable';
      return this.failedStep(VERIFICATION_CHECK_CODES.READABLE, message, stepStartedAt, {
        filePath,
      });
    }
  }

  private async checkHealthy(assetId: string, startedAt: number): Promise<VerificationCheckStep> {
    const stepStartedAt = Date.now();

    try {
      const health = await this.healthService.checkAsset(assetId);
      if (health.status === 'healthy') {
        return this.passedStep(
          VERIFICATION_CHECK_CODES.HEALTHY,
          'Asset health is healthy',
          stepStartedAt,
          {
            status: health.status,
            issueCount: health.issues.length,
            elapsedSinceStartMs: stepStartedAt - startedAt,
          },
        );
      }

      const issueSummary = health.issues.map((issue) => issue.message).join('; ');
      return this.failedStep(
        VERIFICATION_CHECK_CODES.HEALTHY,
        issueSummary.length > 0 ? issueSummary : `Asset health is ${health.status}`,
        stepStartedAt,
        {
          status: health.status,
          issueCount: health.issues.length,
          elapsedSinceStartMs: stepStartedAt - startedAt,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Health check failed';
      return this.failedStep(VERIFICATION_CHECK_CODES.HEALTHY, message, stepStartedAt, {
        status: 'unhealthy',
      });
    }
  }

  private passedStep(
    code: VerificationCheckStep['code'],
    message: string,
    startedAt: number,
    details: Readonly<Record<string, string | number | boolean | null>>,
  ): VerificationCheckStep {
    return {
      code,
      passed: true,
      message,
      durationMs: Date.now() - startedAt,
      details,
    };
  }

  private failedStep(
    code: VerificationCheckStep['code'],
    message: string,
    startedAt: number,
    details: Readonly<Record<string, string | number | boolean | null>>,
  ): VerificationCheckStep {
    return {
      code,
      passed: false,
      message,
      durationMs: Date.now() - startedAt,
      details,
    };
  }

  private persistReport(
    assetId: string,
    startedAt: number,
    steps: readonly VerificationCheckStep[],
  ): DetailedVerificationResult {
    const checkedAt = new Date().toISOString();
    const valid = steps.every((step) => step.passed);
    const report = this.diagnosticsRepository.insertVerificationReport({
      assetId,
      valid,
      steps,
      checkedAt,
      durationMs: Date.now() - startedAt,
    });

    return {
      report,
      valid,
    };
  }
}
