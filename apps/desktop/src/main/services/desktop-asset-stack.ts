import { join } from 'node:path';

import { createAssetPlatform, type AssetPlatform } from '@dubforge/assets';

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
  const assetPlatform = await createAssetPlatform({ rootPath });

  return {
    assetPlatform,
    close(): void {
      assetPlatform.close();
    },
  };
}
