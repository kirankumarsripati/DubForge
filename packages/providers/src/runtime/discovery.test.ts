import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EXTENSION_MANIFEST_FILENAME, EXTENSION_MANIFEST_VERSION } from './constants';
import { discoverExtensions } from './discovery';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('discoverExtensions', () => {
  it('discovers extension manifests from nested directories', async () => {
    const root = join(tmpdir(), `dubforge-discovery-${String(Date.now())}`);
    await mkdir(root, { recursive: true });
    tempDirs.push(root);

    const extensionDir = join(root, 'acme.sample');
    await mkdir(extensionDir, { recursive: true });
    await writeFile(
      join(extensionDir, EXTENSION_MANIFEST_FILENAME),
      JSON.stringify({
        manifestVersion: EXTENSION_MANIFEST_VERSION,
        id: 'acme.sample',
        name: 'Sample',
        version: '1.0.0',
        description: 'Discovered extension',
        runtimeVersion: '>=0.1.0',
        kind: 'external',
        entry: 'index.js',
        capabilities: [{ id: 'stage.validate', type: 'pipeline.stage', key: 'validate' }],
      }),
      'utf8',
    );

    const discovered = await discoverExtensions([root]);
    expect(discovered).toHaveLength(1);
    expect(discovered[0]?.manifest.id).toBe('acme.sample');
    expect(discovered[0]?.sourcePath).toBe(extensionDir);
  });
});
