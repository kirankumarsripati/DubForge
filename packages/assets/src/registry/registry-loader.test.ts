import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { RegistryLoader } from './registry-loader.js';

describe('RegistryLoader', () => {
  it('loads registry manifests from the configured root', async () => {
    const registryRoot = join(dirname(fileURLToPath(import.meta.url)), 'registry-fixtures');
    const registry = await new RegistryLoader({ registryRoots: [registryRoot] }).load();

    expect(registry.listAssets().length).toBeGreaterThan(0);
    expect(registry.getAsset('whisper-base')).not.toBeNull();
    expect(registry.getDownloadManifest('whisper-base').sources.length).toBeGreaterThan(0);
  });
});
