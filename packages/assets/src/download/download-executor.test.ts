import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  atomicRenameVerifiedFile,
  downloadFromManifestSources,
  hashFileSha256,
} from '../download/download-executor.js';
import { createDefaultDownloadProviderRegistry } from '../download/download-provider-registry.js';
import { DOWNLOAD_SOURCE_TYPES } from '../download/source-types.js';

describe('Download executor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dubforge-download-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('downloads from a local-file source and verifies checksum', async () => {
    const content = `asset-payload-${randomUUID()}`;
    const checksum = createHash('sha256').update(content).digest('hex');
    const sourcePath = join(tempDir, 'source.bin');
    const tempPath = join(tempDir, 'target.part');
    const finalPath = join(tempDir, 'target.bin');

    await writeFile(sourcePath, content);

    const registry = createDefaultDownloadProviderRegistry();
    const controller = new AbortController();

    await downloadFromManifestSources({
      manifest: {
        sources: [{ type: DOWNLOAD_SOURCE_TYPES.LOCAL_FILE, url: sourcePath }],
        checksum,
        filename: 'asset.bin',
      },
      registry,
      tempPath,
      assetId: 'test-asset',
      version: '1.0.0',
      signal: controller.signal,
      onProgress: () => undefined,
    });

    const verified = await atomicRenameVerifiedFile(tempPath, finalPath, checksum);
    const stored = await readFile(finalPath);

    expect(stored.toString('utf8')).toBe(content);
    expect(verified.checksum).toBe(checksum);
    expect(await hashFileSha256(finalPath)).toBe(checksum);
  });

  it('rejects downloads when checksum does not match', async () => {
    const content = 'mismatched-content';
    const sourcePath = join(tempDir, 'source.bin');
    const tempPath = join(tempDir, 'target.part');
    const finalPath = join(tempDir, 'target.bin');

    await writeFile(sourcePath, content);

    const registry = createDefaultDownloadProviderRegistry();
    const controller = new AbortController();

    await downloadFromManifestSources({
      manifest: {
        sources: [{ type: DOWNLOAD_SOURCE_TYPES.LOCAL_FILE, url: sourcePath }],
        checksum: createHash('sha256').update('different').digest('hex'),
        filename: 'asset.bin',
      },
      registry,
      tempPath,
      assetId: 'test-asset',
      version: '1.0.0',
      signal: controller.signal,
      onProgress: () => undefined,
    });

    await expect(
      atomicRenameVerifiedFile(
        tempPath,
        finalPath,
        createHash('sha256').update('different').digest('hex'),
      ),
    ).rejects.toThrow('Checksum mismatch after download');
  });
});
