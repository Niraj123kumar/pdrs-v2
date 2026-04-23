'use strict';

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, 'data', 'pdrs.db');

/**
 * Schema migrations run in order, tracked in _migrations. DDL only here; all
 * application reads/writes MUST use prepared statements with bound parameters.
 */
const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_users_role ON users(role);

        CREATE TABLE projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          tech_stack TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_projects_user_id ON projects(user_id);

        CREATE TABLE sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          questions_json TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
          overall_score REAL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX idx_sessions_project_id ON sessions(project_id);
        CREATE INDEX idx_sessions_status ON sessions(status);

        CREATE TABLE answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          tier TEXT NOT NULL DEFAULT 'standard'
            CHECK (tier IN ('basic', 'standard', 'advanced', 'expert')),
          clarity_score REAL,
          reasoning_score REAL,
          depth_score REAL,
          confidence_score REAL,
          feedback TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_answers_session_id ON answers(session_id);

        CREATE TABLE panel_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'scheduled'
            CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
          started_at TEXT,
          ended_at TEXT
        );
        CREATE INDEX idx_panel_sessions_faculty ON panel_sessions(faculty_id);
        CREATE INDEX idx_panel_sessions_student ON panel_sessions(student_id);
        CREATE INDEX idx_panel_sessions_status ON panel_sessions(status);

        CREATE TABLE session_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_session_requests_student ON session_requests(student_id);
        CREATE INDEX idx_session_requests_faculty ON session_requests(faculty_id);
        CREATE INDEX idx_session_requests_status ON session_requests(status);

        CREATE TABLE notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL DEFAULT '',
          is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);

        CREATE TABLE panel_annotations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          panel_session_id INTEGER NOT NULL REFERENCES panel_sessions(id) ON DELETE CASCADE,
          faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          question_index INTEGER NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          score_override REAL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_panel_annotations_panel_session ON panel_annotations(panel_session_id);

        CREATE TABLE login_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          ip TEXT NOT NULL DEFAULT '',
          success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX idx_login_attempts_email ON login_attempts(email);
        CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
      `);
    },
  },
];

const DEMO_ACCOUNTS = [
  {
    name: 'Demo Student',
    email: 'demo_student@pdrs.com',
    password: 'demo1234',
    role: 'student',
  },
  {
    name: 'Demo Faculty',
    email: 'demo_faculty@pdrs.com',
    password: 'demo1234',
    role: 'faculty',
  },
];

function ensureDirFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function openDatabase(dbPath) {
  const resolved = dbPath && dbPath.trim().length > 0
    ? path.resolve(dbPath)
    : DEFAULT_DB_PATH;
  ensureDirFor(resolved);

  const db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const getApplied = db.prepare('SELECT version FROM _migrations WHERE version = ?');
  const recordApplied = db.prepare(
    'INSERT INTO _migrations (version, name) VALUES (?, ?)'
  );

  for (const migration of MIGRATIONS) {
    if (getApplied.get(migration.version)) continue;
    const apply = db.transaction(() => {
      migration.up(db);
      recordApplied.run(migration.version, migration.name);
    });
    apply();
  }
}

function seedDemoAccounts(db) {
  const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
  const findByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );

  for (const account of DEMO_ACCOUNTS) {
    if (findByEmail.get(account.email)) continue;
    const hash = bcrypt.hashSync(account.password, rounds);
    insertUser.run(account.name, account.email, hash, account.role);
  }
}

let cachedDb = null;

function getDatabase(dbPath) {
  if (cachedDb) return cachedDb;
  cachedDb = openDatabase(dbPath);
  runMigrations(cachedDb);
  seedDemoAccounts(cachedDb);
  return cachedDb;
}

function closeDatabase() {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase,
  runMigrations,
  seedDemoAccounts,
  openDatabase,
  MIGRATIONS,
  DEMO_ACCOUNTS,
};
