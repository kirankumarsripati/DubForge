import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Asset diagnostics integration', () => {
  let rootPath: string;

  beforeEach(async () => {
    rootPath = await mkdtemp(join(tmpdir(), 'dubforge-diagnostics-'));
  });

  afterEach(async () => {
    await rm(rootPath, { recursive: true, force: true });
  });

  it('persists download and verification diagnostics for installed assets', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const { createLocalFileFixture, createTestAssetManifest, createTestRegistry } =
      await import('../test/registry-fixtures.js');
    const fixture = await createLocalFileFixture('whisper-base-binary', rootPath);
    const registry = createTestRegistry({
      assets: [
        createTestAssetManifest({
          id: 'whisper-base',
          name: 'Whisper Base',
          localFilePath: fixture.filePath,
          checksum: fixture.checksum,
        }),
      ],
    });

    const service = await createAssetService(rootPath, registry);
    await service.downloadAsset('whisper-base');

    const diagnostics = service.getDiagnostics('whisper-base');
    expect(diagnostics.downloadReports.length).toBeGreaterThan(0);

    const downloadReport = diagnostics.downloadReports[0];
    expect(downloadReport?.url).toBe(fixture.filePath);
    expect(downloadReport?.provider).toBe('local-file');
    expect(downloadReport?.sha256Expected).toBe(fixture.checksum);
    expect(downloadReport?.sha256Actual).toBe(fixture.checksum);
    expect(downloadReport?.success).toBe(true);

    const verificationReport = await service.verifyAsset('whisper-base');
    expect(verificationReport.valid).toBe(true);
    expect(verificationReport.steps).toHaveLength(6);
    expect(verificationReport.steps.every((step) => step.passed)).toBe(true);

    const updatedDiagnostics = service.getDiagnostics('whisper-base');
    expect(updatedDiagnostics.verificationReports.length).toBeGreaterThan(0);
    expect(updatedDiagnostics.latestVerification?.valid).toBe(true);

    service.close();
  });

  it('returns detailed verification failure when the binary is missing', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const { createLocalFileFixture, createTestAssetManifest, createTestRegistry } =
      await import('../test/registry-fixtures.js');
    const fixture = await createLocalFileFixture('missing-binary', rootPath);
    const registry = createTestRegistry({
      assets: [
        createTestAssetManifest({
          id: 'missing-binary',
          name: 'Missing Binary',
          localFilePath: fixture.filePath,
          checksum: fixture.checksum,
        }),
      ],
    });

    const service = await createAssetService(rootPath, registry);
    await service.downloadAsset('missing-binary');
    const installation = service.getInstallation('missing-binary');
    expect(installation?.filePath).not.toBeNull();
    await rm(installation!.filePath!, { force: true });

    const verificationReport = await service.verifyAsset('missing-binary');
    expect(verificationReport.valid).toBe(false);

    const existsStep = verificationReport.steps.find((step) => step.code === 'exists');
    expect(existsStep?.passed).toBe(false);
    expect(existsStep?.message.length).toBeGreaterThan(0);

    service.close();
  });
});
