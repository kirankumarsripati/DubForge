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
      CREATE TABLE IF NOT EXISTS localized_documents (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        source_language_code TEXT NOT NULL,
        target_language_code TEXT NOT NULL,
        source_transcript_id TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        document_json TEXT NOT NULL,
        quality_score INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS translation_memory (
        id TEXT PRIMARY KEY,
        source_language_code TEXT NOT NULL,
        target_language_code TEXT NOT NULL,
        source_text TEXT NOT NULL,
        target_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS glossary_entries (
        id TEXT PRIMARY KEY,
        source_language_code TEXT NOT NULL,
        target_language_code TEXT NOT NULL,
        source_term TEXT NOT NULL,
        target_term TEXT NOT NULL,
        case_sensitive INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS localization_operations (
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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_localized_documents_workflow_language
        ON localized_documents(workflow_id, target_language_code);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_translation_memory_pair_source
        ON translation_memory(source_language_code, target_language_code, source_text);
      CREATE INDEX IF NOT EXISTS idx_glossary_entries_language_pair
        ON glossary_entries(source_language_code, target_language_code);
      CREATE INDEX IF NOT EXISTS idx_localization_operations_workflow
        ON localization_operations(workflow_id);
    `);
  },
};

export const LOCALIZATION_MIGRATIONS: readonly Migration[] = [MIGRATION_001_LOCALIZATION];

export class LocalizationMigrationRunner {
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

    for (const migration of LOCALIZATION_MIGRATIONS) {
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
