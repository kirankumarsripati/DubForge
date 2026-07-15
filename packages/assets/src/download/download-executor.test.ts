import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetDatabase } from '../database/connection.js';
import { DiagnosticsRepository } from '../diagnostics/diagnostics-repository.js';
import { runMigrations } from '../migrations/runner.js';
import {
  atomicRenameVerifiedFile,
  downloadFromManifestSources,
  hashFileSha256,
} from '../download/download-executor.js';
import { createDefaultDownloadProviderRegistry } from '../download/download-provider-registry.js';
import { DOWNLOAD_SOURCE_TYPES } from '../download/source-types.js';

describe('Download executor diagnostics', () => {
  let tempDir: string;
  let diagnosticsRepository: DiagnosticsRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dubforge-download-'));
    const database = new AssetDatabase();
    runMigrations(database.raw);
    diagnosticsRepository = new DiagnosticsRepository(database.raw);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('records a download report for a successful local-file download', async () => {
    const content = `asset-payload-${randomUUID()}`;
    const checksum = createHash('sha256').update(content).digest('hex');
    const sourcePath = join(tempDir, 'source.bin');
    const tempPath = join(tempDir, 'target.part');
    const finalPath = join(tempDir, 'target.bin');
    const downloadId = randomUUID();

    await writeFile(sourcePath, content);

    const registry = createDefaultDownloadProviderRegistry();
    const controller = new AbortController();

    const report = await downloadFromManifestSources({
      manifest: {
        sources: [{ type: DOWNLOAD_SOURCE_TYPES.LOCAL_FILE, url: sourcePath }],
        checksum,
        filename: 'asset.bin',
      },
      registry,
      tempPath,
      assetId: 'test-asset',
      version: '1.0.0',
      downloadId,
      expectedSizeBytes: content.length,
      diagnosticsRepository,
      signal: controller.signal,
      onProgress: () => undefined,
    });

    expect(report.success).toBe(true);
    expect(report.provider).toBe(DOWNLOAD_SOURCE_TYPES.LOCAL_FILE);
    expect(report.sha256Actual).toBe(checksum);
    expect(report.downloadedSizeBytes).toBe(content.length);

    const stored = diagnosticsRepository.listDownloadReportsByAsset('test-asset');
    expect(stored).toHaveLength(1);
    expect(stored[0]?.url).toBe(sourcePath);

    const verified = await atomicRenameVerifiedFile(tempPath, finalPath, checksum);
    const file = await readFile(finalPath);

    expect(file.toString('utf8')).toBe(content);
    expect(verified.checksum).toBe(checksum);
    expect(await hashFileSha256(finalPath)).toBe(checksum);
  });

  it('records a checksum mismatch report with expected and actual hashes', async () => {
    const content = 'mismatched-content';
    const sourcePath = join(tempDir, 'source.bin');
    const tempPath = join(tempDir, 'target.part');
    const expectedChecksum = createHash('sha256').update('different').digest('hex');
    const actualChecksum = createHash('sha256').update(content).digest('hex');

    await writeFile(sourcePath, content);

    const registry = createDefaultDownloadProviderRegistry();
    const controller = new AbortController();

    await expect(
      downloadFromManifestSources({
        manifest: {
          sources: [{ type: DOWNLOAD_SOURCE_TYPES.LOCAL_FILE, url: sourcePath }],
          checksum: expectedChecksum,
          filename: 'asset.bin',
        },
        registry,
        tempPath,
        assetId: 'test-asset',
        version: '1.0.0',
        downloadId: randomUUID(),
        expectedSizeBytes: content.length,
        diagnosticsRepository,
        signal: controller.signal,
        onProgress: () => undefined,
      }),
    ).rejects.toThrow(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);

    const report = diagnosticsRepository.listDownloadReportsByAsset('test-asset')[0];
    expect(report?.success).toBe(false);
    expect(report?.sha256Expected).toBe(expectedChecksum);
    expect(report?.sha256Actual).toBe(actualChecksum);
    expect(report?.errorMessage).toContain('Checksum mismatch');
  });
});
