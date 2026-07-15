import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';

import type { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES } from '../types.js';
import type { AssetRecord } from '../types.js';

export interface VerificationResult {
  readonly assetId: string;
  readonly valid: boolean;
  readonly reason: string | null;
  readonly actualChecksum: string | null;
  readonly expectedChecksum: string | null;
}

export class AssetVerifier {
  constructor(private readonly repository: AssetRepository) {}

  async verifyAsset(assetId: string): Promise<VerificationResult> {
    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      return {
        assetId,
        valid: false,
        reason: 'Asset metadata not found',
        actualChecksum: null,
        expectedChecksum: null,
      };
    }

    return this.verifyRecord(asset);
  }

  async verifyRecord(asset: AssetRecord): Promise<VerificationResult> {
    if (asset.filePath === null) {
      return {
        assetId: asset.id,
        valid: false,
        reason: 'Binary path not set in metadata',
        actualChecksum: null,
        expectedChecksum: asset.checksum,
      };
    }

    try {
      await access(asset.filePath);
    } catch {
      return {
        assetId: asset.id,
        valid: false,
        reason: 'Binary file missing on filesystem',
        actualChecksum: null,
        expectedChecksum: asset.checksum,
      };
    }

    const content = await readFile(asset.filePath);
    const actualChecksum = createHash('sha256').update(content).digest('hex');

    if (asset.checksum !== null && actualChecksum !== asset.checksum) {
      this.repository.updateAssetMetadata(asset.id, { status: ASSET_STATUSES.CORRUPTED });
      return {
        assetId: asset.id,
        valid: false,
        reason: 'Checksum mismatch',
        actualChecksum,
        expectedChecksum: asset.checksum,
      };
    }

    if (asset.status === ASSET_STATUSES.CORRUPTED) {
      this.repository.updateAssetMetadata(asset.id, { status: ASSET_STATUSES.READY });
    }

    return {
      assetId: asset.id,
      valid: true,
      reason: null,
      actualChecksum,
      expectedChecksum: asset.checksum,
    };
  }

  async verifyAll(): Promise<readonly VerificationResult[]> {
    const assets = this.repository.listAssets();
    const results: VerificationResult[] = [];

    for (const asset of assets) {
      if (asset.status === ASSET_STATUSES.MISSING) {
        continue;
      }
      results.push(await this.verifyRecord(asset));
    }

    return results;
  }
}
