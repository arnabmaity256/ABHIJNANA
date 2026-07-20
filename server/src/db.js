// Database layer — SQLite via better-sqlite3.
//
// Runs numbered migrations from server/migrations/ on first connect.
// Exports a singleton `db` instance and a `migrate()` helper.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'abhijnana.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

let _db = null;

export function getDb() {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH, { /* verbose: console.log */ });

  // Performance pragmas — safe for a single-writer local service.
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  return _db;
}

// Run all *.sql files from migrations/ in sorted order, skipping those already
// applied. Tracks state in a `_migrations` meta-table.
export function migrate() {
  const db = getDb();

  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r) => r.name)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  [db] applying migration: ${file}`);
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
  }

  return db;
}

export function close() {
  if (_db) {
    _db.close();
    _db = null;
  }
}
