import { join } from 'node:path';

import { createAssetPlatform, type AssetPlatform } from '@dubforge/assets';

import { resolveDesktopRegistryRoots } from './asset-registry-paths';

export interface DesktopAssetStack {
  readonly assetPlatform: AssetPlatform;
  close(): void;
}

export interface DesktopAssetStackOptions {
  readonly userDataPath: string;
}

export async function createDesktopAssetStack(
  options: DesktopAssetStackOptions,
): Promise<DesktopAssetStack> {
  const rootPath = join(options.userDataPath, 'assets');
  const assetPlatform = await createAssetPlatform({
    rootPath,
    registryRoots: resolveDesktopRegistryRoots(),
  });

  return {
    assetPlatform,
    close(): void {
      assetPlatform.close();
    },
  };
}
