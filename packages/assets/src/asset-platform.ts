import { mkdir } from 'node:fs/promises';

import { AssetManifestRegistry } from './registry/asset-manifest-registry.js';
import { RegistryLoader } from './registry/registry-loader.js';
import { AssetService } from './service/asset-service.js';
import type { AssetServiceOptions } from './service/asset-service.js';
import type { ModelView } from './presentation/model-view.js';
import type { DownloadRecord } from './types.js';

export interface AssetPlatformOptions {
  readonly rootPath: string;
  readonly registryRoots?: readonly string[];
  readonly registry?: AssetManifestRegistry;
}

export interface AssetPlatform {
  readonly service: AssetService;
  readonly registry: AssetManifestRegistry;
  listModels(): readonly ModelView[];
  refreshRegistry(): Promise<void>;
  close(): void;
}

export async function createAssetPlatform(options: AssetPlatformOptions): Promise<AssetPlatform> {
  await mkdir(options.rootPath, { recursive: true });

  const registryRoots = options.registryRoots ?? RegistryLoader.resolveDefaultRegistryRoots();

  const registry = options.registry ?? (await new RegistryLoader({ registryRoots }).load());

  const service = new AssetService({
    rootPath: options.rootPath,
    registry,
  } satisfies AssetServiceOptions);

  service.initialize();

  const platform: AssetPlatform = {
    service,
    registry,
    listModels(): readonly ModelView[] {
      return service.listModelViews();
    },
    async refreshRegistry(): Promise<void> {
      await service.refreshInstallationHealth();
    },
    close(): void {
      service.close();
    },
  };

  await platform.refreshRegistry();
  return platform;
}

export async function enqueueBackgroundDownload(
  service: AssetService,
  assetId: string,
  targetVersion?: string,
): Promise<DownloadRecord> {
  service.initialize();
  service.getRegistry().requireAsset(assetId);
  return service.downloadAssetInBackground(assetId, targetVersion);
}
