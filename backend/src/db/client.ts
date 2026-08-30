import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SCHEMA } from './schema';

export type Db = Database.Database;

/** Opens and migrates the database. `:memory:` is supported for tests. */
export function openDatabase(databasePath: string): Db {
  if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new Database(databasePath);
  db.exec(SCHEMA);
  return db;
}
