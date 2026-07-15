import type { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES } from '../types.js';
import type { AssetRecord } from '../types.js';

export interface DependencyResolution {
  readonly assetId: string;
  readonly satisfied: boolean;
  readonly missingDependencies: readonly string[];
  readonly unsatisfiedRequired: readonly AssetRecord[];
}

export class DependencyTracker {
  constructor(private readonly repository: AssetRepository) {}

  addDependency(assetId: string, dependsOnAssetId: string, optional = false): void {
    const asset = this.repository.getAssetById(assetId);
    const dependency = this.repository.getAssetById(dependsOnAssetId);

    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (dependency === null) {
      throw new Error(`Dependency asset not found: ${dependsOnAssetId}`);
    }

    this.repository.addDependency(assetId, dependsOnAssetId, optional);
  }

  removeDependency(dependencyId: string): void {
    this.repository.removeDependency(dependencyId);
  }

  getDirectDependencies(assetId: string): readonly string[] {
    return this.repository.listDependencies(assetId).map((entry) => entry.dependsOnAssetId);
  }

  getTransitiveDependencies(assetId: string): readonly string[] {
    const visited = new Set<string>();
    const queue = [...this.getDirectDependencies(assetId)];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || visited.has(current)) {
        continue;
      }

      visited.add(current);
      const next = this.getDirectDependencies(current);
      queue.push(...next);
    }

    return [...visited];
  }

  resolveDependencies(assetId: string): DependencyResolution {
    const dependencies = this.repository.listDependencies(assetId);
    const missingDependencies: string[] = [];
    const unsatisfiedRequired: AssetRecord[] = [];

    for (const dependency of dependencies) {
      const dependencyAsset = this.repository.getAssetById(dependency.dependsOnAssetId);
      if (dependencyAsset === null) {
        missingDependencies.push(dependency.dependsOnAssetId);
        continue;
      }

      if (dependency.optional) {
        continue;
      }

      if (dependencyAsset.status !== ASSET_STATUSES.READY) {
        unsatisfiedRequired.push(dependencyAsset);
      }
    }

    return {
      assetId,
      satisfied: missingDependencies.length === 0 && unsatisfiedRequired.length === 0,
      missingDependencies,
      unsatisfiedRequired,
    };
  }

  canActivate(assetId: string): boolean {
    return this.resolveDependencies(assetId).satisfied;
  }

  listDependents(assetId: string): readonly string[] {
    return this.repository.listDependents(assetId).map((entry) => entry.assetId);
  }
}
