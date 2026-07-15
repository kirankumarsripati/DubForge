import type { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES, HEALTH_STATUSES } from '../types.js';
import type { AssetHealthIssue, AssetHealthReport, AssetRecord, HealthStatus } from '../types.js';
import type { AssetVerifier } from '../verification/verifier.js';
import type { VersionManager } from '../version/version-manager.js';

export class AssetHealthService {
  constructor(
    private readonly repository: AssetRepository,
    private readonly verifier: AssetVerifier,
    private readonly versionManager: VersionManager,
  ) {}

  async checkAsset(assetId: string): Promise<AssetHealthReport> {
    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      return {
        assetId,
        assetName: assetId,
        status: HEALTH_STATUSES.UNHEALTHY,
        issues: [
          {
            assetId,
            code: 'asset_not_found',
            message: 'Asset metadata not found',
            severity: HEALTH_STATUSES.UNHEALTHY,
          },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    const issues = await this.collectIssues(asset);
    return {
      assetId: asset.id,
      assetName: asset.name,
      status: this.resolveOverallStatus(issues),
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  async checkAll(): Promise<readonly AssetHealthReport[]> {
    const assets = this.repository.listAssets();
    const reports: AssetHealthReport[] = [];

    for (const asset of assets) {
      reports.push(await this.checkAsset(asset.id));
    }

    return reports;
  }

  private async collectIssues(asset: AssetRecord): Promise<AssetHealthIssue[]> {
    const issues: AssetHealthIssue[] = [];

    if (asset.status === ASSET_STATUSES.MISSING) {
      issues.push({
        assetId: asset.id,
        code: 'asset_missing',
        message: 'Asset binary has not been downloaded',
        severity: HEALTH_STATUSES.DEGRADED,
      });
      return issues;
    }

    const verification = await this.verifier.verifyRecord(asset);
    if (!verification.valid) {
      issues.push({
        assetId: asset.id,
        code: 'verification_failed',
        message: verification.reason ?? 'Verification failed',
        severity: HEALTH_STATUSES.UNHEALTHY,
      });
    }

    const versions = this.repository.listVersions(asset.id);
    const latestVersion = this.versionManager.selectLatest(versions.map((entry) => entry.version));
    if (latestVersion !== null && this.versionManager.isNewer(latestVersion, asset.version)) {
      issues.push({
        assetId: asset.id,
        code: 'version_outdated',
        message: `Newer version available: ${latestVersion}`,
        severity: HEALTH_STATUSES.DEGRADED,
      });
    }

    if (asset.status === ASSET_STATUSES.OUTDATED) {
      issues.push({
        assetId: asset.id,
        code: 'status_outdated',
        message: 'Asset marked as outdated',
        severity: HEALTH_STATUSES.DEGRADED,
      });
    }

    return issues;
  }

  private resolveOverallStatus(issues: readonly AssetHealthIssue[]): HealthStatus {
    if (issues.some((issue) => issue.severity === HEALTH_STATUSES.UNHEALTHY)) {
      return HEALTH_STATUSES.UNHEALTHY;
    }

    if (issues.some((issue) => issue.severity === HEALTH_STATUSES.DEGRADED)) {
      return HEALTH_STATUSES.DEGRADED;
    }

    return HEALTH_STATUSES.HEALTHY;
  }
}
