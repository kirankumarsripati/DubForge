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
    expect(firstApplied).toHaveLength(1);

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
      'downloads',
      'schema_migrations',
    ]);

    database.close();
  });

  it('records migration version', () => {
    const database = new AssetDatabase();
    runMigrations(database.raw);

    const version = database.raw
      .prepare('SELECT version, name FROM schema_migrations ORDER BY version ASC')
      .all() as { version: number; name: string }[];

    expect(version).toEqual([{ version: 1, name: 'initial' }]);
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

  it('seeds catalog and downloads asset with verification', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const service = await createAssetService(rootPath);
    const assets = service.listAssets();

    expect(assets.length).toBeGreaterThan(0);

    const whisper = assets.find((asset) => asset.id === 'whisper-base');
    expect(whisper).toBeDefined();

    const download = await service.downloadAsset('whisper-base');
    expect(download.status).toBe('completed');

    const resolved = service.resolveAsset('whisper-base');
    expect(resolved).not.toBeNull();
    expect(resolved?.filePath).toContain('whisper-base');

    const valid = await service.verifyAsset('whisper-base');
    expect(valid).toBe(true);

    const health = await service.checkHealth('whisper-base');
    expect(health.status).toBe('healthy');

    service.close();
  });

  it('tracks required dependencies', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const { ASSET_CATEGORIES, ASSET_KINDS } = await import('../types.js');
    const service = await createAssetService(rootPath, { seedCatalog: false });
    service.seedCatalog(
      [
        {
          id: 'base-model',
          name: 'Base Model',
          kind: ASSET_KINDS.MODEL,
          category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
          version: '1.0.0',
        },
        {
          id: 'extended-model',
          name: 'Extended Model',
          kind: ASSET_KINDS.MODEL,
          category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
          version: '1.0.0',
        },
      ],
      [{ assetId: 'extended-model', dependsOnAssetId: 'base-model', optional: false }],
    );

    const unresolved = service.resolveDependencies('extended-model');
    expect(unresolved.satisfied).toBe(false);

    await service.downloadAsset('base-model');
    const resolved = service.resolveDependencies('extended-model');
    expect(resolved.satisfied).toBe(true);

    service.close();
  });

  it('deletes asset binary and resets metadata', async () => {
    const { createAssetService } = await import('../service/asset-service.js');
    const service = await createAssetService(rootPath);

    await service.downloadAsset('piper-en');
    const deleted = await service.deleteAsset('piper-en');

    expect(deleted.status).toBe('missing');
    expect(deleted.filePath).toBeNull();
    expect(service.resolveAsset('piper-en')).toBeNull();

    service.close();
  });
});
