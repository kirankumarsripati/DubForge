import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REGISTRY_INDEX_FILENAME,
  registeredAssetManifestSchema,
  registryIndexSchema,
  type RegisteredAssetManifest,
  type RegistryDependency,
} from './registry-schema.js';
import {
  AssetManifestRegistry,
  toRegisteredAsset,
  type AssetRegistrySnapshot,
  type RegisteredAsset,
} from './asset-manifest-registry.js';

export interface RegistryLoaderOptions {
  readonly registryRoots: readonly string[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRegistryRoot(roots: readonly string[]): Promise<string | null> {
  for (const root of roots) {
    const registryPath = join(root, REGISTRY_INDEX_FILENAME);
    if (await fileExists(registryPath)) {
      return root;
    }
  }

  return null;
}

async function readRegisteredAsset(
  registryRoot: string,
  manifestPath: string,
): Promise<RegisteredAssetManifest> {
  const absolutePath = resolve(registryRoot, manifestPath);
  const content = await readFile(absolutePath, 'utf8');
  return registeredAssetManifestSchema.parse(JSON.parse(content));
}

const PROVIDERS_REGISTRY_SUBPATH = '@dubforge/providers/assets/registry.json';

export class RegistryLoader {
  constructor(private readonly options: RegistryLoaderOptions) {}

  async load(): Promise<AssetManifestRegistry> {
    const snapshot = await this.loadSnapshot();
    return new AssetManifestRegistry(snapshot);
  }

  async loadSnapshot(): Promise<AssetRegistrySnapshot> {
    const registryRoot = await resolveRegistryRoot(this.options.registryRoots);
    if (registryRoot === null) {
      throw new Error('Asset registry not found in configured roots');
    }

    const indexContent = await readFile(join(registryRoot, REGISTRY_INDEX_FILENAME), 'utf8');
    const index = registryIndexSchema.parse(JSON.parse(indexContent));
    const assets: RegisteredAsset[] = [];
    const dependencies: RegistryDependency[] = [...index.dependencies];

    for (const entry of index.assets) {
      const manifest = await readRegisteredAsset(registryRoot, entry.manifestPath);
      if (manifest.id !== entry.id) {
        throw new Error(
          `Registry manifest id mismatch for ${entry.id}: expected ${entry.id}, received ${manifest.id}`,
        );
      }

      assets.push(toRegisteredAsset(manifest));
    }

    return { assets, dependencies };
  }

  static resolveDefaultRegistryRoots(): string[] {
    const require = createRequire(import.meta.url);
    const roots: string[] = [];

    try {
      const registryIndexPath = require.resolve(PROVIDERS_REGISTRY_SUBPATH);
      roots.push(dirname(registryIndexPath));
      roots.push(join(dirname(registryIndexPath), '../../src/assets'));
    } catch {
      // Providers package is unavailable in this runtime.
    }

    const moduleDir = dirname(fileURLToPath(import.meta.url));
    roots.push(join(moduleDir, 'registry-fixtures'));
    return roots;
  }
}
