import type Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

export const MIGRATION_001_VOICE_PERFORMANCE: Migration = {
  version: 1,
  name: 'voice-performance-repository',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS voice_performances (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        localized_document_id TEXT NOT NULL,
        performance_json TEXT NOT NULL,
        stitched_audio_path TEXT,
        aligned_audio_path TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS voice_segment_artifacts (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        artifact_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pronunciation_entries (
        id TEXT PRIMARY KEY,
        language_code TEXT NOT NULL,
        term TEXT NOT NULL,
        pronunciation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS voice_performance_operations (
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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_performances_workflow_language
        ON voice_performances(workflow_id, language_code);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_segment_artifacts_segment
        ON voice_segment_artifacts(workflow_id, language_code, segment_id);
      CREATE INDEX IF NOT EXISTS idx_voice_performance_operations_workflow
        ON voice_performance_operations(workflow_id);
    `);
  },
};

export const VOICE_PERFORMANCE_MIGRATIONS: readonly Migration[] = [MIGRATION_001_VOICE_PERFORMANCE];

export class VoicePerformanceMigrationRunner {
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

    for (const migration of VOICE_PERFORMANCE_MIGRATIONS) {
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
