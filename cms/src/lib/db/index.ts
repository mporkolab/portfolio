/**
 * Az SQLite kapcsolat és a migrációk.
 *
 * Folyamatonként egy kapcsolat él (a `better-sqlite3` szinkron, egy szálon fut,
 * egyetlen standalone Node-folyamat mellett ez a helyes modell). Az első
 * használatkor lefutnak a `drizzle/` mappa még le nem futott migrációi, így egy
 * új image indulásakor a séma magától naprakész lesz.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '../env';
import * as schema from './schema';

export type DB = BetterSQLite3Database<typeof schema>;

let instance: { db: DB; sqlite: Database.Database } | null = null;

export const databasePath = () => path.resolve(env('DATABASE_PATH') || 'data/cms.db');

function open() {
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const sqlite = new Database(file);
  // WAL: a portfólió olvasásai nem várnak a CMS írására, és fordítva.
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');

  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.resolve(env('MIGRATIONS_DIR') || 'drizzle'),
  });

  return { db, sqlite };
}

/** A közös adatbázis-kapcsolat. Az első hívás nyitja meg és migrál. */
export function getDb(): DB {
  instance ??= open();
  return instance.db;
}

export { schema };
