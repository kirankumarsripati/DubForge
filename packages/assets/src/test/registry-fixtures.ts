import { createHash, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DOWNLOAD_SOURCE_TYPES } from '../download/source-types.js';
import { AssetManifestRegistry, toRegisteredAsset } from '../registry/asset-manifest-registry.js';
import type { RegisteredAssetManifest } from '../registry/registry-schema.js';

export async function createLocalFileFixture(
  content: string,
  directory: string,
): Promise<{ readonly filePath: string; readonly checksum: string }> {
  const checksum = createHash('sha256').update(content).digest('hex');
  const filePath = join(directory, `${randomUUID()}.bin`);
  await writeFile(filePath, content);

  return { filePath, checksum };
}

export function createTestAssetManifest(input: {
  readonly id: string;
  readonly name: string;
  readonly localFilePath: string;
  readonly checksum: string;
  readonly category?: RegisteredAssetManifest['category'];
  readonly requiredBy?: readonly string[];
}): RegisteredAssetManifest {
  return {
    id: input.id,
    name: input.name,
    kind: 'model',
    category: input.category ?? 'speech-to-text',
    version: '1.0.0',
    latestVersion: '1.0.0',
    estimatedSizeBytes: 1024,
    requiredBy: [...(input.requiredBy ?? [])],
    sources: [{ type: DOWNLOAD_SOURCE_TYPES.LOCAL_FILE, url: input.localFilePath }],
    checksum: input.checksum,
    filename: 'asset.bin',
  };
}

import type { RegistryDependency } from '../registry/registry-schema.js';

export function createTestRegistry(input: {
  readonly assets: readonly RegisteredAssetManifest[];
  readonly dependencies?: readonly RegistryDependency[];
}): AssetManifestRegistry {
  return new AssetManifestRegistry({
    assets: input.assets.map(toRegisteredAsset),
    dependencies: input.dependencies ?? [],
  });
}
