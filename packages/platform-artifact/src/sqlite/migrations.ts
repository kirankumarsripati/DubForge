import Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

const MIGRATION_001: Migration = {
  version: 1,
  name: 'initial',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        node_id TEXT,
        kind TEXT NOT NULL,
        path TEXT NOT NULL,
        checksum TEXT,
        size_bytes INTEGER,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workflow_states (
        workflow_id TEXT PRIMARY KEY,
        artifact_root TEXT NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_artifacts_workflow ON artifacts(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_node ON artifacts(node_id);
    `);
  },
};

export const ARTIFACT_MIGRATIONS: readonly Migration[] = [MIGRATION_001];

export class ArtifactMigrationRunner {
  constructor(private readonly db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  }

  migrate(): void {
    const currentVersion =
      (
        this.db.prepare('SELECT MAX(version) AS maxVersion FROM schema_migrations').get() as {
          maxVersion: number | null;
        }
      ).maxVersion ?? 0;

    const pending = ARTIFACT_MIGRATIONS.filter((migration) => migration.version > currentVersion);
    const insert = this.db.prepare(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
    );

    const run = this.db.transaction(() => {
      for (const migration of pending) {
        migration.up(this.db);
        insert.run(migration.version, migration.name, new Date().toISOString());
      }
    });

    run();
  }
}
