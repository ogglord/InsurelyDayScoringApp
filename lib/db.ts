import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Schema versioning
//
// The schema version is tracked in SQLite's built-in `PRAGMA user_version`
// (an integer). Each migration bumps it by one and runs inside a transaction.
//
//   user_version 1  ==  schema v1.0  (the initial release)
//
// TO CHANGE THE SCHEMA: never edit migration 1. Append a new migration object
// with the next integer `version` and an idempotent-as-possible `up()`. It runs
// automatically on next boot for every database below that version. See CLAUDE.md.
// ---------------------------------------------------------------------------

interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseSync) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial schema (v1.0)',
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS teams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          members TEXT NOT NULL DEFAULT '[]',
          circuit TEXT,                 -- 'A' | 'B' | NULL (orienteering)
          sort INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,           -- points | time | guesstimate | checkpoints
          weight REAL NOT NULL DEFAULT 1.0,
          config TEXT NOT NULL DEFAULT '{}',
          sort INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
          team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          value TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(tournament_id, team_id)
        );
      `);

      // Bring a pre-versioning database (created before this migration system)
      // up to the v1.0 shape: ensure the `circuit` column exists.
      const cols = db.prepare('PRAGMA table_info(teams)').all() as { name: string }[];
      if (!cols.some((c) => c.name === 'circuit')) {
        db.exec('ALTER TABLE teams ADD COLUMN circuit TEXT');
      }
    },
  },
];

// Highest version this build knows about — i.e. the schema version of the code.
export const SCHEMA_VERSION = MIGRATIONS.reduce((m, x) => Math.max(m, x.version), 0);

function currentVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

function migrate(db: DatabaseSync): void {
  const from = currentVersion(db);
  const pending = MIGRATIONS.filter((m) => m.version > from).sort((a, b) => a.version - b.version);
  for (const m of pending) {
    db.exec('BEGIN');
    try {
      m.up(db);
      // user_version only accepts a literal; m.version is a trusted integer.
      db.exec(`PRAGMA user_version = ${m.version}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${m.version} (${m.name}) failed: ${(err as Error).message}`);
    }
  }
}

// Singleton across dev hot-reloads.
const g = globalThis as unknown as { __db?: DatabaseSync };

function init(): DatabaseSync {
  const path = process.env.DB_PATH || './data/conference.db';
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  // These must run outside a transaction.
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  migrate(db);
  return db;
}

export function db(): DatabaseSync {
  if (!g.__db) g.__db = init();
  return g.__db;
}
