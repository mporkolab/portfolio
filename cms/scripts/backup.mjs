/**
 * Konzisztens pillanatkép az adatbázisról futás közben is (SQLite online
 * backup), a képek mappája mellé: <adatmappa>/backups/cms-<időbélyeg>.db.
 *
 *   docker compose exec cms node scripts/backup.mjs
 *
 * A képfájlok sosem változnak (egyedi a nevük), így azokat egyszerű másolással
 * lehet menteni; lásd README.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const file = path.resolve(process.env.DATABASE_PATH || 'data/cms.db');
if (!fs.existsSync(file)) {
  console.error(`Nincs adatbázis: ${file}`);
  process.exit(1);
}

const dir = path.join(path.dirname(file), 'backups');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const target = path.join(dir, `cms-${stamp}.db`);

const db = new Database(file, { readonly: true });
await db.backup(target);
db.close();
console.log(`Mentve: ${target}`);
