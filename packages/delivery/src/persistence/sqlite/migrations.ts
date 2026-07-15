import type Database from 'better-sqlite3';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Database.Database) => void;
}

export const MIGRATION_001_DELIVERY: Migration = {
  version: 1,
  name: 'delivery-repository',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS deliverables (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        packaging_plan_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        output_path TEXT NOT NULL,
        status TEXT NOT NULL,
        checksum TEXT,
        size_bytes INTEGER,
        duration_ms INTEGER,
        deliverable_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS validation_reports (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        deliverable_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        playable INTEGER NOT NULL,
        report_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (deliverable_id) REFERENCES deliverables(id)
      );

      CREATE TABLE IF NOT EXISTS export_history (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        export_profile_id TEXT NOT NULL,
        status TEXT NOT NULL,
        export_time_ms INTEGER,
        export_size_bytes INTEGER,
        validation_score INTEGER,
        warning_count INTEGER,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS delivery_operations (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        job_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        status TEXT NOT NULL,
        artifact_path TEXT,
        duration_ms INTEGER,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_deliverables_workflow ON deliverables(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_validation_reports_deliverable ON validation_reports(deliverable_id);
      CREATE INDEX IF NOT EXISTS idx_export_history_workflow ON export_history(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_operations_workflow ON delivery_operations(workflow_id);
    `);
  },
};

export const DELIVERY_MIGRATIONS: readonly Migration[] = [MIGRATION_001_DELIVERY];

export class DeliveryMigrationRunner {
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

    for (const migration of DELIVERY_MIGRATIONS) {
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
