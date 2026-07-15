import type { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES } from '../types.js';
import type { AssetCategory, AssetKind, AssetRecord, ResolvedAsset } from '../types.js';
import type { VersionManager } from '../version/version-manager.js';
import type { VersionRange } from '../version/version-manager.js';

export interface ResolveByIdOptions {
  readonly requireReady?: boolean;
}

export interface ResolveByKindOptions {
  readonly kind: AssetKind;
  readonly category: AssetCategory;
  readonly versionRange?: VersionRange;
  readonly requireReady?: boolean;
}

export class AssetResolver {
  constructor(
    private readonly repository: AssetRepository,
    private readonly versionManager: VersionManager,
  ) {}

  resolveById(assetId: string, options: ResolveByIdOptions = {}): ResolvedAsset | null {
    const asset = this.repository.getAssetById(assetId);
    if (asset === null) {
      return null;
    }

    if (options.requireReady === true && asset.status !== ASSET_STATUSES.READY) {
      return null;
    }

    return this.toResolvedAsset(asset);
  }

  resolveByKind(options: ResolveByKindOptions): ResolvedAsset | null {
    const candidates = this.repository
      .listAssetsByKind(options.kind)
      .filter((asset) => asset.category === options.category);

    const filtered = candidates.filter((asset) => {
      if (options.requireReady === true && asset.status !== ASSET_STATUSES.READY) {
        return false;
      }

      if (options.versionRange === undefined) {
        return true;
      }

      return this.versionManager.findBestMatch([asset.version], options.versionRange) !== null;
    });

    if (filtered.length === 0) {
      return null;
    }

    const versions = filtered.map((asset) => asset.version);
    const bestVersion =
      options.versionRange === undefined
        ? this.versionManager.selectLatest(versions)
        : this.versionManager.findBestMatch(versions, options.versionRange);

    if (bestVersion === null) {
      return null;
    }

    const asset = filtered.find((entry) => entry.version === bestVersion);
    if (asset === undefined) {
      return null;
    }

    return this.toResolvedAsset(asset);
  }

  resolveAllReady(): readonly ResolvedAsset[] {
    return this.repository
      .listAssetsByStatus(ASSET_STATUSES.READY)
      .map((asset) => this.toResolvedAsset(asset))
      .filter((resolved): resolved is ResolvedAsset => resolved !== null);
  }

  private toResolvedAsset(asset: AssetRecord): ResolvedAsset | null {
    if (asset.filePath === null) {
      return null;
    }

    const activeVersion = this.repository.getActiveVersion(asset.id);
    return {
      asset,
      filePath: asset.filePath,
      version: activeVersion,
    };
  }
}
