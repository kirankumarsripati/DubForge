import type Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

export const MIGRATION_001_TEMPORAL: Migration = {
  version: 1,
  name: 'temporal-repository',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS alignment_plans (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        voice_performance_id TEXT NOT NULL,
        plan_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audio_compositions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        alignment_plan_id TEXT NOT NULL,
        composition_json TEXT NOT NULL,
        aligned_speech_path TEXT NOT NULL,
        composed_audio_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS temporal_operations (
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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_alignment_plans_workflow_language
        ON alignment_plans(workflow_id, language_code);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_compositions_workflow_language
        ON audio_compositions(workflow_id, language_code);
      CREATE INDEX IF NOT EXISTS idx_temporal_operations_workflow
        ON temporal_operations(workflow_id);
    `);
  },
};

export const TEMPORAL_MIGRATIONS: readonly Migration[] = [MIGRATION_001_TEMPORAL];

export class TemporalMigrationRunner {
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

    for (const migration of TEMPORAL_MIGRATIONS) {
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
