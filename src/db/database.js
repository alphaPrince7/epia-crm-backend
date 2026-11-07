/**
 * SQLite database setup (better-sqlite3 — simple, synchronous, zero-config).
 * One file on disk (epia.db) so records survive restarts — fixes the original
 * in-memory array that lost everything on every restart.
 */
const Database = require("better-sqlite3");
const path = require("path");

// Allow an in-memory DB for tests (fast, isolated), a file otherwise.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "..", "epia.db");
const db = new Database(DB_PATH === ":memory:" ? ":memory:" : DB_PATH);

db.pragma("journal_mode = WAL"); // better concurrency/durability

db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    phone     TEXT NOT NULL,
    date      TEXT NOT NULL,            -- ISO date string
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    appointmentId INTEGER NOT NULL,
    channel       TEXT NOT NULL DEFAULT 'whatsapp',
    status        TEXT NOT NULL,         -- sent | failed
    providerId    TEXT,                  -- id returned by the (simulated) provider
    error         TEXT,                  -- non-sensitive error summary
    createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (appointmentId) REFERENCES appointments(id)
  );

  CREATE TABLE IF NOT EXISTS followups (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    appointmentId INTEGER NOT NULL,
    date          TEXT NOT NULL,         -- the follow-up date
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending | completed
    notes         TEXT,
    createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
    completedAt   TEXT,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id),
    -- prevents duplicate follow-ups for the same appointment + date (Task 3.5)
    UNIQUE (appointmentId, date)
  );
`);

module.exports = db;
