import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CreateAssetInput } from '../types.js';
import { assetCatalogFileSchema, type DiscoveredAssetEntry } from './catalog-schema.js';

export interface DiscoveredCatalog {
  readonly assets: readonly DiscoveredAssetEntry[];
  readonly dependencies: readonly {
    readonly assetId: string;
    readonly dependsOnAssetId: string;
    readonly optional: boolean;
  }[];
}

export interface CatalogMetadata {
  readonly latestVersion: string;
  readonly estimatedSizeBytes: number;
  readonly requiredBy: readonly string[];
}

const CATALOG_SUFFIX = '.asset-catalog.json';

async function readCatalogFile(filePath: string): Promise<DiscoveredCatalog | null> {
  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = assetCatalogFileSchema.parse(JSON.parse(content));
    return {
      assets: parsed.assets,
      dependencies: parsed.dependencies,
    };
  } catch {
    return null;
  }
}

async function discoverInDirectory(root: string): Promise<DiscoveredCatalog> {
  const assets: DiscoveredAssetEntry[] = [];
  const dependencies: DiscoveredCatalog['dependencies'][number][] = [];

  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return { assets, dependencies };
  }

  for (const entry of entries) {
    if (!entry.endsWith(CATALOG_SUFFIX)) {
      continue;
    }

    const catalog = await readCatalogFile(join(root, entry));
    if (catalog === null) {
      continue;
    }

    assets.push(...catalog.assets);
    dependencies.push(...catalog.dependencies);
  }

  return { assets, dependencies };
}

export async function discoverAssetCatalogs(roots: readonly string[]): Promise<DiscoveredCatalog> {
  const assetsById = new Map<string, DiscoveredAssetEntry>();
  const dependencyKeys = new Set<string>();
  const dependencies: DiscoveredCatalog['dependencies'][number][] = [];

  for (const root of roots) {
    const catalog = await discoverInDirectory(root);
    for (const asset of catalog.assets) {
      assetsById.set(asset.id, asset);
    }

    for (const dependency of catalog.dependencies) {
      const key = `${dependency.assetId}:${dependency.dependsOnAssetId}`;
      if (!dependencyKeys.has(key)) {
        dependencyKeys.add(key);
        dependencies.push(dependency);
      }
    }
  }

  return {
    assets: [...assetsById.values()],
    dependencies,
  };
}

export function toCreateAssetInput(entry: DiscoveredAssetEntry): CreateAssetInput {
  return {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    category: entry.category,
    version: entry.version,
    sourceUrl: entry.sourceUrl ?? null,
  };
}

export function buildCatalogMetadataMap(
  catalog: DiscoveredCatalog,
): ReadonlyMap<string, CatalogMetadata> {
  const metadata = new Map<string, CatalogMetadata>();

  for (const asset of catalog.assets) {
    metadata.set(asset.id, {
      latestVersion: asset.latestVersion,
      estimatedSizeBytes: asset.estimatedSizeBytes,
      requiredBy: asset.requiredBy,
    });
  }

  return metadata;
}
