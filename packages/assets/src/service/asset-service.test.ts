import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetDatabase } from '../database/connection.js';
import { runMigrations } from '../migrations/runner.js';

describe('MigrationRunner', () => {
  it('applies initial migration once', () => {
    const database = new AssetDatabase();
    const firstApplied = runMigrations(database.raw);
    expect(firstApplied).toHaveLength(3);

    const secondApplied = runMigrations(database.raw);
    expect(secondApplied).toHaveLength(0);

    const tables = database.raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];

    expect(tables.map((table) => table.name)).toEqual([
      'asset_dependencies',
      'asset_versions',
      'assets',
      'download_reports',
      'downloads',
      'schema_migrations',
      'verification_reports',
    ]);

    database.close();
  });

  it('records migration version', () => {
    const database = new AssetDatabase();
    runMigrations(database.raw);

    const version = database.raw
      .prepare('SELECT version, name FROM schema_migrations ORDER BY version ASC')
      .all() as { version: number; name: string }[];

    expect(version).toEqual([
      { version: 1, name: 'initial' },
      { version: 2, name: 'download_manifest' },
      { version: 3, name: 'asset_diagnostics' },
    ]);
    database.close();
  });
});

describe('AssetService integration', () => {
  let rootPath: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    rootPath = await mkdtemp(join(tmpdir(), 'dubforge-assets-'));
    cleanup = async () => {
      await rm(rootPath, { recursive: true, force: true });
    };
  });

  afterEach(async () => {
    await cleanup();
  });

  it('lists all registry assets on a fresh installation', async () => {
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
    const models = service.listModelViews();

    expect(models).toHaveLength(1);
    expect(models[0]?.status).toBe('not-installed');
    expect(models[0]?.installLocation).toBeNull();
    expect(models[0]?.health).toBeNull();

    service.close();
  });

  it('downloads asset with verification and exposes installation details', async () => {
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
    const download = await service.downloadAsset('whisper-base');
    expect(download.status).toBe('completed');

    const model = service.listModelViews().find((entry) => entry.id === 'whisper-base');
    expect(model?.status).toBe('installed');
    expect(model?.checksum).toBe(fixture.checksum);
    expect(model?.installLocation).toContain('whisper-base');
    expect(model?.health).toBe('healthy');

    const resolved = service.resolveAsset('whisper-base');
    expect(resolved).not.toBeNull();

    const report = await service.verifyAsset('whisper-base');
    expect(report.valid).toBe(true);
    expect(report.steps.map((step) => step.code)).toEqual([
      'exists',
      'size',
      'sha256',
      'permissions',
      'readable',
      'healthy',
    ]);

    const diagnostics = service.getDiagnostics('whisper-base');
    expect(diagnostics.downloadReports.length).toBeGreaterThan(0);
    expect(diagnostics.verificationReports.length).toBeGreaterThan(0);

    service.close();
  });

  it('tracks required dependencies from the registry', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const { createLocalFileFixture, createTestAssetManifest, createTestRegistry } =
      await import('../test/registry-fixtures.js');
    const baseFixture = await createLocalFileFixture('base-model-binary', rootPath);
    const extendedFixture = await createLocalFileFixture('extended-model-binary', rootPath);
    const registry = createTestRegistry({
      assets: [
        createTestAssetManifest({
          id: 'base-model',
          name: 'Base Model',
          localFilePath: baseFixture.filePath,
          checksum: baseFixture.checksum,
        }),
        createTestAssetManifest({
          id: 'extended-model',
          name: 'Extended Model',
          localFilePath: extendedFixture.filePath,
          checksum: extendedFixture.checksum,
        }),
      ],
      dependencies: [
        { assetId: 'extended-model', dependsOnAssetId: 'base-model', optional: false },
      ],
    });

    const service = await createAssetService(rootPath, registry);
    const unresolved = service.resolveDependencies('extended-model');
    expect(unresolved.satisfied).toBe(false);

    await service.downloadAsset('base-model');
    const resolved = service.resolveDependencies('extended-model');
    expect(resolved.satisfied).toBe(true);

    service.close();
  });

  it('deletes installation state and returns asset to not installed', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const { createLocalFileFixture, createTestAssetManifest, createTestRegistry } =
      await import('../test/registry-fixtures.js');
    const fixture = await createLocalFileFixture('piper-en-binary', rootPath);
    const registry = createTestRegistry({
      assets: [
        createTestAssetManifest({
          id: 'piper-en',
          name: 'Piper English',
          category: 'speech',
          localFilePath: fixture.filePath,
          checksum: fixture.checksum,
        }),
      ],
    });

    const service = await createAssetService(rootPath, registry);
    await service.downloadAsset('piper-en');
    await service.deleteAsset('piper-en');

    const model = service.listModelViews().find((entry) => entry.id === 'piper-en');
    expect(model?.status).toBe('not-installed');
    expect(model?.installLocation).toBeNull();
    expect(service.resolveAsset('piper-en')).toBeNull();
    expect(service.getInstallation('piper-en')).toBeNull();

    service.close();
  });
});
