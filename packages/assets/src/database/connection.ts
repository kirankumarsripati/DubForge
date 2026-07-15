import { join } from 'node:path';

import Database from 'better-sqlite3';

import { DATABASE_FILENAME } from '../constants.js';

export interface AssetDatabaseOptions {
  readonly databasePath?: string;
  readonly readonly?: boolean;
}

export class AssetDatabase {
  private readonly db: Database.Database;

  constructor(options: AssetDatabaseOptions = {}) {
    const databasePath = options.databasePath ?? ':memory:';
    this.db = new Database(databasePath, {
      readonly: options.readonly ?? false,
      fileMustExist: false,
    });
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  get raw(): Database.Database {
    return this.db;
  }

  transaction<T>(callback: () => T): T {
    const transaction = this.db.transaction(callback);
    return transaction();
  }

  close(): void {
    this.db.close();
  }
}

export function createAssetDatabase(rootPath: string): AssetDatabase {
  return new AssetDatabase({ databasePath: join(rootPath, DATABASE_FILENAME) });
}
