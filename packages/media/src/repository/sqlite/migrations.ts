import type Database from 'better-sqlite3';

import type { Migration } from './migration-types.js';

export class MediaMigrationRunner {
  constructor(private readonly db: Database.Database) {}

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedVersions = new Set(
      this.db
        .prepare('SELECT version FROM schema_migrations')
        .all()
        .map((row) => (row as { version: number }).version),
    );

    for (const migration of MEDIA_MIGRATIONS) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      migration.up(this.db);
      this.db
        .prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)')
        .run(migration.version, migration.name, new Date().toISOString());
    }
  }
}

export const MIGRATION_001_MEDIA_CATALOG: Migration = {
  version: 1,
  name: 'media-catalog',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        filename TEXT NOT NULL,
        container TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        video_codec TEXT NOT NULL,
        audio_track_count INTEGER NOT NULL,
        bitrate_kbps INTEGER NOT NULL,
        probed_at TEXT NOT NULL,
        workflow_id TEXT,
        job_id TEXT
      );

      CREATE TABLE IF NOT EXISTS media_operations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        media_file_id TEXT,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        status TEXT NOT NULL,
        artifact_path TEXT,
        duration_ms INTEGER,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_media_files_workflow ON media_files(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_media_operations_workflow ON media_operations(workflow_id);
    `);
  },
};

export const MEDIA_MIGRATIONS: readonly Migration[] = [MIGRATION_001_MEDIA_CATALOG];
