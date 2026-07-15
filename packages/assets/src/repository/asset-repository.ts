import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import { ASSET_STATUSES } from '../types.js';
import type {
  AssetDependencyRecord,
  AssetRecord,
  AssetVersionRecord,
  CreateAssetInput,
  UpdateAssetMetadataInput,
} from '../types.js';
import { assetManifestSchema } from '../discovery/catalog-schema.js';
import type { AssetDownloadManifest } from '../download/types.js';
import type { RegisteredAsset } from '../registry/asset-manifest-registry.js';

interface AssetRow {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly version: string;
  readonly filePath: string | null;
  readonly checksum: string | null;
  readonly sizeBytes: number | null;
  readonly status: string;
  readonly sourceUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface AssetVersionRow {
  readonly id: string;
  readonly assetId: string;
  readonly version: string;
  readonly filePath: string | null;
  readonly checksum: string | null;
  readonly sizeBytes: number | null;
  readonly releasedAt: string;
  readonly isActive: number;
}

interface DependencyRow {
  readonly id: string;
  readonly assetId: string;
  readonly dependsOnAssetId: string;
  readonly optional: number;
}

function mapAssetRow(row: AssetRow): AssetRecord {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind as AssetRecord['kind'],
    category: row.category as AssetRecord['category'],
    version: row.version,
    filePath: row.filePath,
    checksum: row.checksum,
    sizeBytes: row.sizeBytes,
    status: row.status as AssetRecord['status'],
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapVersionRow(row: AssetVersionRow): AssetVersionRecord {
  return {
    id: row.id,
    assetId: row.assetId,
    version: row.version,
    filePath: row.filePath,
    checksum: row.checksum,
    sizeBytes: row.sizeBytes,
    releasedAt: row.releasedAt,
    isActive: row.isActive === 1,
  };
}

function mapDependencyRow(row: DependencyRow): AssetDependencyRecord {
  return {
    id: row.id,
    assetId: row.assetId,
    dependsOnAssetId: row.dependsOnAssetId,
    optional: row.optional === 1,
  };
}

export class AssetRepository {
  private readonly insertAsset: Database.Statement;
  private readonly updateAsset: Database.Statement;
  private readonly selectAssetById: Database.Statement;
  private readonly selectAssets: Database.Statement;
  private readonly selectAssetsByKind: Database.Statement;
  private readonly selectAssetsByStatus: Database.Statement;
  private readonly clearAssetBinaryStatement: Database.Statement;
  private readonly deleteAssetStatement: Database.Statement;
  private readonly insertVersion: Database.Statement;
  private readonly selectVersionsByAsset: Database.Statement;
  private readonly selectActiveVersion: Database.Statement;
  private readonly deactivateVersions: Database.Statement;
  private readonly activateVersionStatement: Database.Statement;
  private readonly insertDependency: Database.Statement;
  private readonly selectDependencies: Database.Statement;
  private readonly selectDependents: Database.Statement;
  private readonly deleteDependency: Database.Statement;
  private readonly selectManifest: Database.Statement;
  private readonly upsertManifestStatement: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.insertAsset = db.prepare(`
      INSERT INTO assets (
        id, name, kind, category, version, file_path, checksum, size_bytes,
        status, source_url, manifest_json, created_at, updated_at
      ) VALUES (
        @id, @name, @kind, @category, @version, @filePath, @checksum, @sizeBytes,
        @status, @sourceUrl, @manifestJson, @createdAt, @updatedAt
      )
    `);

    this.updateAsset = db.prepare(`
      UPDATE assets SET
        file_path = COALESCE(@filePath, file_path),
        checksum = COALESCE(@checksum, checksum),
        size_bytes = COALESCE(@sizeBytes, size_bytes),
        status = COALESCE(@status, status),
        version = COALESCE(@version, version),
        updated_at = @updatedAt
      WHERE id = @id
    `);

    this.selectAssetById = db.prepare(`
      SELECT
        id, name, kind, category, version,
        file_path AS filePath, checksum, size_bytes AS sizeBytes,
        status, source_url AS sourceUrl, created_at AS createdAt, updated_at AS updatedAt
      FROM assets WHERE id = ?
    `);

    this.selectAssets = db.prepare(`
      SELECT
        id, name, kind, category, version,
        file_path AS filePath, checksum, size_bytes AS sizeBytes,
        status, source_url AS sourceUrl, created_at AS createdAt, updated_at AS updatedAt
      FROM assets ORDER BY name ASC
    `);

    this.selectAssetsByKind = db.prepare(`
      SELECT
        id, name, kind, category, version,
        file_path AS filePath, checksum, size_bytes AS sizeBytes,
        status, source_url AS sourceUrl, created_at AS createdAt, updated_at AS updatedAt
      FROM assets WHERE kind = ? ORDER BY name ASC
    `);

    this.selectAssetsByStatus = db.prepare(`
      SELECT
        id, name, kind, category, version,
        file_path AS filePath, checksum, size_bytes AS sizeBytes,
        status, source_url AS sourceUrl, created_at AS createdAt, updated_at AS updatedAt
      FROM assets WHERE status = ? ORDER BY name ASC
    `);

    this.clearAssetBinaryStatement = db.prepare(`
      UPDATE assets SET
        file_path = NULL,
        checksum = NULL,
        size_bytes = NULL,
        status = @status,
        updated_at = @updatedAt
      WHERE id = @id
    `);

    this.deleteAssetStatement = db.prepare('DELETE FROM assets WHERE id = ?');

    this.insertVersion = db.prepare(`
      INSERT INTO asset_versions (
        id, asset_id, version, file_path, checksum, size_bytes, released_at, is_active
      ) VALUES (
        @id, @assetId, @version, @filePath, @checksum, @sizeBytes, @releasedAt, @isActive
      )
    `);

    this.selectVersionsByAsset = db.prepare(`
      SELECT
        id, asset_id AS assetId, version, file_path AS filePath,
        checksum, size_bytes AS sizeBytes, released_at AS releasedAt, is_active AS isActive
      FROM asset_versions WHERE asset_id = ? ORDER BY released_at DESC
    `);

    this.selectActiveVersion = db.prepare(`
      SELECT
        id, asset_id AS assetId, version, file_path AS filePath,
        checksum, size_bytes AS sizeBytes, released_at AS releasedAt, is_active AS isActive
      FROM asset_versions WHERE asset_id = ? AND is_active = 1 LIMIT 1
    `);

    this.deactivateVersions = db.prepare(
      'UPDATE asset_versions SET is_active = 0 WHERE asset_id = ?',
    );

    this.activateVersionStatement = db.prepare(
      'UPDATE asset_versions SET is_active = 1 WHERE id = ?',
    );

    this.insertDependency = db.prepare(`
      INSERT INTO asset_dependencies (id, asset_id, depends_on_asset_id, optional)
      VALUES (@id, @assetId, @dependsOnAssetId, @optional)
    `);

    this.selectDependencies = db.prepare(`
      SELECT id, asset_id AS assetId, depends_on_asset_id AS dependsOnAssetId, optional
      FROM asset_dependencies WHERE asset_id = ?
    `);

    this.selectDependents = db.prepare(`
      SELECT id, asset_id AS assetId, depends_on_asset_id AS dependsOnAssetId, optional
      FROM asset_dependencies WHERE depends_on_asset_id = ?
    `);

    this.deleteDependency = db.prepare('DELETE FROM asset_dependencies WHERE id = ?');

    this.selectManifest = db.prepare(
      'SELECT manifest_json AS manifestJson FROM assets WHERE id = ?',
    );
    this.upsertManifestStatement = db.prepare(`
      UPDATE assets SET manifest_json = @manifestJson, updated_at = @updatedAt WHERE id = @id
    `);
  }

  createAsset(input: CreateAssetInput): AssetRecord {
    const now = new Date().toISOString();
    const record: AssetRecord = {
      id: input.id,
      name: input.name,
      kind: input.kind,
      category: input.category,
      version: input.version,
      filePath: null,
      checksum: null,
      sizeBytes: null,
      status: ASSET_STATUSES.MISSING,
      sourceUrl: input.sourceUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.insertAsset.run({
      id: record.id,
      name: record.name,
      kind: record.kind,
      category: record.category,
      version: record.version,
      filePath: record.filePath,
      checksum: record.checksum,
      sizeBytes: record.sizeBytes,
      status: record.status,
      sourceUrl: record.sourceUrl,
      manifestJson:
        input.manifest === undefined || input.manifest === null
          ? null
          : JSON.stringify(input.manifest),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    return record;
  }

  upsertManifest(assetId: string, manifest: AssetDownloadManifest): void {
    const existing = this.getAssetById(assetId);
    if (existing === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const validated = assetManifestSchema.parse(manifest);
    this.upsertManifestStatement.run({
      id: assetId,
      manifestJson: JSON.stringify(validated),
      updatedAt: new Date().toISOString(),
    });
  }

  getManifest(assetId: string): AssetDownloadManifest | null {
    const row = this.selectManifest.get(assetId) as { manifestJson: string | null } | undefined;
    if (row?.manifestJson == null) {
      return null;
    }

    const parsed = assetManifestSchema.parse(JSON.parse(row.manifestJson));
    return {
      sources: parsed.sources,
      checksum: parsed.checksum ?? null,
      filename: parsed.filename,
    };
  }

  requireManifest(assetId: string): AssetDownloadManifest {
    const manifest = this.getManifest(assetId);
    if (manifest === null) {
      throw new Error(`Asset ${assetId} does not have a download manifest`);
    }

    return manifest;
  }

  ensureInstallationRecord(registered: RegisteredAsset): AssetRecord {
    const existing = this.getAssetById(registered.id);
    if (existing !== null) {
      return existing;
    }

    return this.createAsset({
      id: registered.id,
      name: registered.name,
      kind: registered.kind,
      category: registered.category,
      version: registered.version,
      sourceUrl: null,
    });
  }

  deleteInstallation(assetId: string): void {
    this.deleteAssetStatement.run(assetId);
  }

  getInstallation(assetId: string): AssetRecord | null {
    return this.getAssetById(assetId);
  }

  updateAssetMetadata(assetId: string, input: UpdateAssetMetadataInput): AssetRecord {
    const existing = this.getAssetById(assetId);
    if (existing === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const updatedAt = new Date().toISOString();
    this.updateAsset.run({
      id: assetId,
      filePath: input.filePath ?? null,
      checksum: input.checksum ?? null,
      sizeBytes: input.sizeBytes ?? null,
      status: input.status ?? null,
      version: input.version ?? null,
      updatedAt,
    });

    const updated = this.getAssetById(assetId);
    if (updated === null) {
      throw new Error(`Asset not found after update: ${assetId}`);
    }

    return updated;
  }

  getAssetById(assetId: string): AssetRecord | null {
    const row = this.selectAssetById.get(assetId) as AssetRow | undefined;
    return row === undefined ? null : mapAssetRow(row);
  }

  listAssets(): readonly AssetRecord[] {
    const rows = this.selectAssets.all() as AssetRow[];
    return rows.map(mapAssetRow);
  }

  listAssetsByKind(kind: AssetRecord['kind']): readonly AssetRecord[] {
    const rows = this.selectAssetsByKind.all(kind) as AssetRow[];
    return rows.map(mapAssetRow);
  }

  listAssetsByStatus(status: AssetRecord['status']): readonly AssetRecord[] {
    const rows = this.selectAssetsByStatus.all(status) as AssetRow[];
    return rows.map(mapAssetRow);
  }

  clearAssetBinary(assetId: string, status: AssetRecord['status']): AssetRecord {
    const existing = this.getAssetById(assetId);
    if (existing === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const updatedAt = new Date().toISOString();
    this.clearAssetBinaryStatement.run({
      id: assetId,
      status,
      updatedAt,
    });

    const updated = this.getAssetById(assetId);
    if (updated === null) {
      throw new Error(`Asset not found after clear: ${assetId}`);
    }

    return updated;
  }

  deleteAsset(assetId: string): void {
    this.deleteAssetStatement.run(assetId);
  }

  addVersion(
    assetId: string,
    version: string,
    metadata: {
      readonly filePath?: string | null;
      readonly checksum?: string | null;
      readonly sizeBytes?: number | null;
      readonly activate?: boolean;
    } = {},
  ): AssetVersionRecord {
    const asset = this.getAssetById(assetId);
    if (asset === null) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const shouldActivate = metadata.activate ?? false;
    const versionId = randomUUID();
    const releasedAt = new Date().toISOString();

    const createVersion = this.db.transaction(() => {
      if (shouldActivate) {
        this.deactivateVersions.run(assetId);
      }

      this.insertVersion.run({
        id: versionId,
        assetId,
        version,
        filePath: metadata.filePath ?? null,
        checksum: metadata.checksum ?? null,
        sizeBytes: metadata.sizeBytes ?? null,
        releasedAt,
        isActive: shouldActivate ? 1 : 0,
      });
    });

    createVersion();

    const versions = this.listVersions(assetId);
    const created = versions.find((entry) => entry.id === versionId);
    if (created === undefined) {
      throw new Error(`Version not found after insert: ${versionId}`);
    }

    return created;
  }

  listVersions(assetId: string): readonly AssetVersionRecord[] {
    const rows = this.selectVersionsByAsset.all(assetId) as AssetVersionRow[];
    return rows.map(mapVersionRow);
  }

  getActiveVersion(assetId: string): AssetVersionRecord | null {
    const row = this.selectActiveVersion.get(assetId) as AssetVersionRow | undefined;
    return row === undefined ? null : mapVersionRow(row);
  }

  activateVersion(versionId: string): AssetVersionRecord {
    const versionRow = this.db
      .prepare(
        `SELECT id, asset_id AS assetId, version, file_path AS filePath,
         checksum, size_bytes AS sizeBytes, released_at AS releasedAt, is_active AS isActive
         FROM asset_versions WHERE id = ?`,
      )
      .get(versionId) as AssetVersionRow | undefined;

    if (versionRow === undefined) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const activate = this.db.transaction(() => {
      this.deactivateVersions.run(versionRow.assetId);
      this.activateVersionStatement.run(versionId);
    });

    activate();

    const activated = this.db
      .prepare(
        `SELECT id, asset_id AS assetId, version, file_path AS filePath,
         checksum, size_bytes AS sizeBytes, released_at AS releasedAt, is_active AS isActive
         FROM asset_versions WHERE id = ?`,
      )
      .get(versionId) as AssetVersionRow;

    return mapVersionRow(activated);
  }

  addDependency(
    assetId: string,
    dependsOnAssetId: string,
    optional = false,
  ): AssetDependencyRecord {
    if (assetId === dependsOnAssetId) {
      throw new Error('Asset cannot depend on itself');
    }

    const dependency: AssetDependencyRecord = {
      id: randomUUID(),
      assetId,
      dependsOnAssetId,
      optional,
    };

    this.insertDependency.run({
      id: dependency.id,
      assetId: dependency.assetId,
      dependsOnAssetId: dependency.dependsOnAssetId,
      optional: optional ? 1 : 0,
    });

    return dependency;
  }

  listDependencies(assetId: string): readonly AssetDependencyRecord[] {
    const rows = this.selectDependencies.all(assetId) as DependencyRow[];
    return rows.map(mapDependencyRow);
  }

  listDependents(assetId: string): readonly AssetDependencyRecord[] {
    const rows = this.selectDependents.all(assetId) as DependencyRow[];
    return rows.map(mapDependencyRow);
  }

  removeDependency(dependencyId: string): void {
    this.deleteDependency.run(dependencyId);
  }
}
