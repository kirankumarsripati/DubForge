import type Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

export const MIGRATION_001_INITIAL: Migration = {
  version: 1,
  name: 'initial',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        category TEXT NOT NULL,
        version TEXT NOT NULL,
        file_path TEXT,
        checksum TEXT,
        size_bytes INTEGER,
        status TEXT NOT NULL,
        source_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS asset_versions (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        version TEXT NOT NULL,
        file_path TEXT,
        checksum TEXT,
        size_bytes INTEGER,
        released_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS asset_dependencies (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        depends_on_asset_id TEXT NOT NULL,
        optional INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        UNIQUE(asset_id, depends_on_asset_id)
      );

      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        target_version TEXT NOT NULL,
        target_path TEXT NOT NULL,
        bytes_downloaded INTEGER NOT NULL DEFAULT 0,
        total_bytes INTEGER,
        status TEXT NOT NULL,
        error_message TEXT,
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets(kind);
      CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
      CREATE INDEX IF NOT EXISTS idx_asset_versions_asset ON asset_versions(asset_id);
      CREATE INDEX IF NOT EXISTS idx_asset_dependencies_asset ON asset_dependencies(asset_id);
      CREATE INDEX IF NOT EXISTS idx_downloads_asset ON downloads(asset_id);
      CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
    `);
  },
};

export const MIGRATION_002_DOWNLOAD_MANIFEST: Migration = {
  version: 2,
  name: 'download_manifest',
  up: (db) => {
    db.exec(`
      ALTER TABLE assets ADD COLUMN manifest_json TEXT;
      ALTER TABLE downloads ADD COLUMN temp_path TEXT;
    `);

    db.exec(`
      UPDATE downloads
      SET temp_path = target_path || '.part'
      WHERE temp_path IS NULL;
    `);
  },
};

export const ALL_MIGRATIONS: readonly Migration[] = [
  MIGRATION_001_INITIAL,
  MIGRATION_002_DOWNLOAD_MANIFEST,
];
