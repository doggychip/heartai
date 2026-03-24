import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'tracker.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (!_db) throw new Error('Database not initialized');
  return _db;
}

export function initDb() {
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      birth_date TEXT,
      avatar_color TEXT DEFAULT '#8b5cf6',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS child_goals (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      progress INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS child_schedule (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      activity TEXT NOT NULL,
      category TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS child_milestones (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      achieved_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );

    CREATE TABLE IF NOT EXISTS child_daily_log (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood TEXT,
      sleep_hours INTEGER,
      notes TEXT,
      highlights TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  console.log('Database initialized at', DB_PATH);
}
