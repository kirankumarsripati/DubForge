import type { AssetDownloadManifest } from '../download/types.js';
import type { AssetCategory, AssetKind } from '../types.js';
import type { RegisteredAssetManifest, RegistryDependency } from './registry-schema.js';

export interface RegisteredAsset {
  readonly id: string;
  readonly name: string;
  readonly kind: AssetKind;
  readonly category: AssetCategory;
  readonly version: string;
  readonly latestVersion: string;
  readonly estimatedSizeBytes: number;
  readonly requiredBy: readonly string[];
  readonly downloadManifest: AssetDownloadManifest;
}

export interface AssetRegistrySnapshot {
  readonly assets: readonly RegisteredAsset[];
  readonly dependencies: readonly RegistryDependency[];
}

function toDownloadManifest(manifest: RegisteredAssetManifest): AssetDownloadManifest {
  return {
    sources: manifest.sources,
    checksum: manifest.checksum ?? null,
    filename: manifest.filename,
  };
}

export function toRegisteredAsset(manifest: RegisteredAssetManifest): RegisteredAsset {
  return {
    id: manifest.id,
    name: manifest.name,
    kind: manifest.kind,
    category: manifest.category,
    version: manifest.version,
    latestVersion: manifest.latestVersion,
    estimatedSizeBytes: manifest.estimatedSizeBytes,
    requiredBy: manifest.requiredBy,
    downloadManifest: toDownloadManifest(manifest),
  };
}

export class AssetManifestRegistry {
  private readonly assetsById: ReadonlyMap<string, RegisteredAsset>;
  private readonly dependencies: readonly RegistryDependency[];

  constructor(snapshot: AssetRegistrySnapshot) {
    this.assetsById = new Map(snapshot.assets.map((asset) => [asset.id, asset]));
    this.dependencies = snapshot.dependencies;
  }

  listAssets(): readonly RegisteredAsset[] {
    return [...this.assetsById.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  getAsset(assetId: string): RegisteredAsset | null {
    return this.assetsById.get(assetId) ?? null;
  }

  requireAsset(assetId: string): RegisteredAsset {
    const asset = this.getAsset(assetId);
    if (asset === null) {
      throw new Error(`Registered asset not found: ${assetId}`);
    }

    return asset;
  }

  getDependencies(assetId: string): readonly RegistryDependency[] {
    return this.dependencies.filter((dependency) => dependency.assetId === assetId);
  }

  listDependents(assetId: string): readonly RegisteredAsset[] {
    const dependents = this.dependencies
      .filter((dependency) => dependency.dependsOnAssetId === assetId)
      .map((dependency) => this.getAsset(dependency.assetId))
      .filter((asset): asset is RegisteredAsset => asset !== null);

    return dependents;
  }

  getDownloadManifest(assetId: string): AssetDownloadManifest {
    return this.requireAsset(assetId).downloadManifest;
  }
}
