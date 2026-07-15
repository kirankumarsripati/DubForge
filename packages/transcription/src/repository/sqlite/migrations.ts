import type Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

export const MIGRATION_001_LOCALIZATION: Migration = {
  version: 1,
  name: 'localization-repository',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS canonical_transcripts (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        source TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        transcript_json TEXT NOT NULL,
        quality_score INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS transcription_operations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        language_code TEXT,
        status TEXT NOT NULL,
        artifact_path TEXT,
        duration_ms INTEGER,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_transcripts_workflow_language
        ON canonical_transcripts(workflow_id, language_code);
      CREATE INDEX IF NOT EXISTS idx_transcription_operations_workflow
        ON transcription_operations(workflow_id);
    `);
  },
};

export const TRANSCRIPTION_MIGRATIONS: readonly Migration[] = [MIGRATION_001_LOCALIZATION];

export class TranscriptionMigrationRunner {
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

    for (const migration of TRANSCRIPTION_MIGRATIONS) {
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
