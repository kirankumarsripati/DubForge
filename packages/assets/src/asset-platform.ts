import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCatalogMetadataMap,
  discoverAssetCatalogs,
  toCreateAssetInput,
  type CatalogMetadata,
  type DiscoveredCatalog,
} from './discovery/catalog-discovery.js';
import { toModelView, type ModelView } from './presentation/model-view.js';
import { AssetService } from './service/asset-service.js';
import type { AssetServiceOptions } from './service/asset-service.js';
import type { DownloadRecord } from './types.js';

export interface AssetPlatformOptions extends Omit<AssetServiceOptions, 'seedCatalog'> {
  readonly catalogRoots?: readonly string[];
}

export interface AssetPlatform {
  readonly service: AssetService;
  getCatalogMetadata(): ReadonlyMap<string, CatalogMetadata>;
  listModels(): readonly ModelView[];
  refreshCatalog(): Promise<void>;
  close(): void;
}

function resolveDefaultCatalogRoots(): string[] {
  const require = createRequire(import.meta.url);
  const roots: string[] = [];

  try {
    const providersPackageJson = require.resolve('@dubforge/providers/package.json');
    const providersRoot = dirname(providersPackageJson);
    roots.push(join(providersRoot, 'dist/assets/catalogs'));
    roots.push(join(providersRoot, 'src/assets/catalogs'));
  } catch {
    // Providers package is unavailable in this runtime.
  }

  const moduleDir = dirname(fileURLToPath(import.meta.url));
  roots.push(join(moduleDir, 'catalog'));

  return roots;
}

function applyDiscoveredCatalog(service: AssetService, discovered: DiscoveredCatalog): void {
  service.initialize();
  service.seedCatalog(discovered.assets.map(toCreateAssetInput), discovered.dependencies);
}

export async function createAssetPlatform(options: AssetPlatformOptions): Promise<AssetPlatform> {
  await mkdir(options.rootPath, { recursive: true });

  const service = new AssetService({
    ...options,
    seedCatalog: false,
  });

  const catalogRoots = options.catalogRoots ?? resolveDefaultCatalogRoots();
  let catalogMetadata: ReadonlyMap<string, CatalogMetadata> = new Map<string, CatalogMetadata>();

  const platform: AssetPlatform = {
    service,
    getCatalogMetadata(): ReadonlyMap<string, CatalogMetadata> {
      return catalogMetadata;
    },
    listModels(): readonly ModelView[] {
      service.initialize();
      const dependencyTracker = service.getDependencyTracker();
      const downloadManager = service.getDownloadManager();

      return service.listAssets().map((asset) => {
        const dependents = dependencyTracker.listDependents(asset.id).map((dependentId) => {
          const dependentAsset = service.getAsset(dependentId);
          return dependentAsset?.name ?? dependentId;
        });

        return toModelView({
          asset,
          downloads: downloadManager.listDownloadsByAsset(asset.id),
          metadata: catalogMetadata.get(asset.id),
          dependents,
        });
      });
    },
    async refreshCatalog(): Promise<void> {
      const discovered = await discoverAssetCatalogs(catalogRoots);
      applyDiscoveredCatalog(service, discovered);
      catalogMetadata = buildCatalogMetadataMap(discovered);
      await service.checkAllHealth();
    },
    close(): void {
      service.close();
    },
  };

  await platform.refreshCatalog();
  return platform;
}

export function enqueueBackgroundDownload(
  service: AssetService,
  assetId: string,
  targetVersion?: string,
): Promise<DownloadRecord> {
  service.initialize();
  const asset = service.getAsset(assetId);
  if (asset === null) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  const version = targetVersion ?? asset.version;
  const downloadManager = service.getDownloadManager();
  return downloadManager.enqueueDownload(assetId, version).then((download) => {
    void downloadManager.startDownload(download.id).catch(() => undefined);
    return download;
  });
}
