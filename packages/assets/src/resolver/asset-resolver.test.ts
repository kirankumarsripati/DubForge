import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetDatabase } from '../database/connection.js';
import { runMigrations } from '../migrations/runner.js';
import { AssetRepository } from '../repository/asset-repository.js';
import { AssetResolver } from './asset-resolver.js';
import { ASSET_CATEGORIES, ASSET_KINDS, ASSET_STATUSES } from '../types.js';
import { VersionManager } from '../version/version-manager.js';

describe('AssetResolver', () => {
  let database: AssetDatabase;
  let repository: AssetRepository;
  let resolver: AssetResolver;

  beforeEach(() => {
    database = new AssetDatabase();
    runMigrations(database.raw);
    repository = new AssetRepository(database.raw);
    resolver = new AssetResolver(repository, new VersionManager());
  });

  afterEach(() => {
    database.close();
  });

  it('resolves ready assets by kind', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dubforge-resolver-'));
    const filePath = join(root, 'model.bin');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, 'payload');

    repository.createAsset({
      id: 'resolver-model',
      name: 'Resolver Model',
      kind: ASSET_KINDS.MODEL,
      category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
      version: '1.0.0',
    });

    repository.updateAssetMetadata('resolver-model', {
      filePath,
      status: ASSET_STATUSES.READY,
      checksum: 'unused',
      sizeBytes: 7,
    });

    const resolved = resolver.resolveByKind({
      kind: ASSET_KINDS.MODEL,
      category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
      requireReady: true,
    });

    expect(resolved?.asset.id).toBe('resolver-model');
    await rm(root, { recursive: true, force: true });
  });
});
