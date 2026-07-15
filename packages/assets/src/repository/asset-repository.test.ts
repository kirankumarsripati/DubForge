import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetDatabase } from '../database/connection.js';
import { runMigrations } from '../migrations/runner.js';
import { AssetRepository } from './asset-repository.js';
import { ASSET_CATEGORIES, ASSET_KINDS, ASSET_STATUSES } from '../types.js';

describe('AssetRepository', () => {
  let database: AssetDatabase;
  let repository: AssetRepository;

  beforeEach(() => {
    database = new AssetDatabase();
    runMigrations(database.raw);
    repository = new AssetRepository(database.raw);
  });

  afterEach(() => {
    database.close();
  });

  it('creates and retrieves assets with prepared statements', () => {
    const created = repository.createAsset({
      id: 'test-model',
      name: 'Test Model',
      kind: ASSET_KINDS.MODEL,
      category: ASSET_CATEGORIES.SPEECH,
      version: '1.0.0',
    });

    expect(created.status).toBe(ASSET_STATUSES.MISSING);

    const fetched = repository.getAssetById('test-model');
    expect(fetched?.name).toBe('Test Model');
  });

  it('manages versions in a transaction', () => {
    repository.createAsset({
      id: 'versioned-model',
      name: 'Versioned',
      kind: ASSET_KINDS.MODEL,
      category: ASSET_CATEGORIES.TRANSLATION,
      version: '1.0.0',
    });

    repository.addVersion('versioned-model', '1.0.0', {
      filePath: '/tmp/model.bin',
      checksum: 'abc',
      sizeBytes: 100,
      activate: true,
    });

    const active = repository.getActiveVersion('versioned-model');
    expect(active?.version).toBe('1.0.0');
    expect(active?.isActive).toBe(true);

    repository.addVersion('versioned-model', '1.1.0', { activate: true });
    const versions = repository.listVersions('versioned-model');
    expect(versions.filter((entry) => entry.isActive)).toHaveLength(1);
    expect(repository.getActiveVersion('versioned-model')?.version).toBe('1.1.0');
  });

  it('tracks dependencies', () => {
    repository.createAsset({
      id: 'parent',
      name: 'Parent',
      kind: ASSET_KINDS.MODEL,
      category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
      version: '1.0.0',
    });

    repository.createAsset({
      id: 'child',
      name: 'Child',
      kind: ASSET_KINDS.MODEL,
      category: ASSET_CATEGORIES.SPEECH_TO_TEXT,
      version: '1.0.0',
    });

    const dependency = repository.addDependency('child', 'parent');
    expect(dependency.dependsOnAssetId).toBe('parent');
    expect(repository.listDependencies('child')).toHaveLength(1);
    expect(repository.listDependents('parent')).toHaveLength(1);
  });
});
