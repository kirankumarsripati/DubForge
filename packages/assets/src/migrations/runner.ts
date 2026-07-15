import type Database from 'better-sqlite3';

import type { MigrationRecord } from '../types.js';
import { ALL_MIGRATIONS } from './migrations.js';

export class MigrationRunner {
  private readonly insertMigration: Database.Statement;
  private readonly selectMigrations: Database.Statement;
  private readonly selectMaxVersion: Database.Statement;

  constructor(private readonly db: Database.Database) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
    this.insertMigration = db.prepare(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
    );
    this.selectMigrations = db.prepare(
      'SELECT version, name, applied_at AS appliedAt FROM schema_migrations ORDER BY version ASC',
    );
    this.selectMaxVersion = db.prepare('SELECT MAX(version) AS maxVersion FROM schema_migrations');
  }

  getAppliedMigrations(): readonly MigrationRecord[] {
    return this.selectMigrations.all() as MigrationRecord[];
  }

  getCurrentVersion(): number {
    const row = this.selectMaxVersion.get() as { maxVersion: number | null };
    return row.maxVersion ?? 0;
  }

  migrate(): readonly MigrationRecord[] {
    const currentVersion = this.getCurrentVersion();
    const pending = ALL_MIGRATIONS.filter((migration) => migration.version > currentVersion);

    if (pending.length === 0) {
      return [];
    }

    const applied: MigrationRecord[] = [];

    const runPending = this.db.transaction(() => {
      for (const migration of pending) {
        migration.up(this.db);
        const appliedAt = new Date().toISOString();
        this.insertMigration.run(migration.version, migration.name, appliedAt);
        applied.push({
          version: migration.version,
          name: migration.name,
          appliedAt,
        });
      }
    });

    runPending();
    return applied;
  }
}

export function runMigrations(db: Database.Database): readonly MigrationRecord[] {
  const runner = new MigrationRunner(db);
  return runner.migrate();
}
