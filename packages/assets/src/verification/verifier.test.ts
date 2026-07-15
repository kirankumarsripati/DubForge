import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AssetDatabase } from '../database/connection.js';
import { runMigrations } from '../migrations/runner.js';
import { AssetRepository } from '../repository/asset-repository.js';
import { ASSET_STATUSES } from '../types.js';
import { hashFileSha256 } from './file-hash.js';
import { AssetVerifier } from './verifier.js';

describe('hashFileSha256', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dubforge-hash-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('computes checksum using streaming reads', async () => {
    const content = 'x'.repeat(256 * 1024);
    const filePath = join(tempDir, 'large-chunk.bin');
    await writeFile(filePath, content);

    const expected = createHash('sha256').update(content).digest('hex');
    await expect(hashFileSha256(filePath)).resolves.toBe(expected);
  });
});

describe('AssetVerifier', () => {
  let tempDir: string;
  let database: AssetDatabase;
  let repository: AssetRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dubforge-verifier-'));
    database = new AssetDatabase();
    runMigrations(database.raw);
    repository = new AssetRepository(database.raw);
  });

  afterEach(async () => {
    database.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('verifies installed assets without loading the full file into memory', async () => {
    const content = 'whisper-medium-payload';
    const checksum = createHash('sha256').update(content).digest('hex');
    const filePath = join(tempDir, 'whisper-medium.bin');
    await writeFile(filePath, content);

    repository.createAsset({
      id: 'whisper-medium',
      name: 'Whisper Medium',
      kind: 'model',
      category: 'speech-to-text',
      version: '1.0.0',
    });
    repository.updateAssetMetadata('whisper-medium', {
      filePath,
      checksum,
      sizeBytes: content.length,
      status: ASSET_STATUSES.READY,
    });

    const verifier = new AssetVerifier(repository);
    const asset = repository.getAssetById('whisper-medium');
    if (asset === null) {
      throw new Error('Expected whisper-medium asset.');
    }

    const result = await verifier.verifyRecord(asset);
    expect(result.valid).toBe(true);
    expect(result.actualChecksum).toBe(checksum);
  });

  it('returns a verification failure instead of throwing when the binary is missing', async () => {
    repository.createAsset({
      id: 'missing-file',
      name: 'Missing File',
      kind: 'model',
      category: 'speech-to-text',
      version: '1.0.0',
    });
    repository.updateAssetMetadata('missing-file', {
      filePath: join(tempDir, 'does-not-exist.bin'),
      checksum: 'abc123',
      sizeBytes: 1,
      status: ASSET_STATUSES.READY,
    });

    const verifier = new AssetVerifier(repository);
    const asset = repository.getAssetById('missing-file');
    if (asset === null) {
      throw new Error('Expected missing-file asset.');
    }

    const result = await verifier.verifyRecord(asset);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('missing');
  });
});
