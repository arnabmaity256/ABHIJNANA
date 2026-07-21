-- 001_initial.sql — Core schema for ABHIJÑĀNA
-- Replaces the JSON file store with proper relational tables.

CREATE TABLE IF NOT EXISTS records (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL,
  case_reference TEXT NOT NULL,
  authority_id  TEXT NOT NULL,
  jurisdiction  TEXT,
  legal_status  TEXT NOT NULL DEFAULT 'Confirmed Fake',
  reason        TEXT NOT NULL,
  flagged_by    TEXT NOT NULL,
  flagged_at    TEXT NOT NULL,
  duration_sec  REAL NOT NULL,
  source_label  TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  severity      TEXT DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL,
  agency_id     TEXT NOT NULL,
  clearance     TEXT DEFAULT 'L2',
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disputes (
  id            TEXT PRIMARY KEY,
  record_id     TEXT NOT NULL REFERENCES records(id),
  filed_by      TEXT NOT NULL,
  contact       TEXT DEFAULT '',
  grounds       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',
  filed_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL DEFAULT 'url',
  media_label   TEXT,
  url           TEXT DEFAULT '',
  category      TEXT DEFAULT 'other',
  description   TEXT NOT NULL,
  reported_by   TEXT NOT NULL DEFAULT 'Anonymous member of the public',
  contact       TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new',
  submitted_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  action        TEXT NOT NULL,
  record_id     TEXT,
  actor         TEXT NOT NULL,
  authority     TEXT NOT NULL,
  detail        TEXT NOT NULL,
  timestamp     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS queries (
  id            TEXT PRIMARY KEY,
  verdict       TEXT NOT NULL,
  record_id     TEXT,
  kind          TEXT,
  value         TEXT,
  at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token         TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT DEFAULT (datetime('now')),
  expires_at    TEXT
);

-- Indexes for common access patterns
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
CREATE INDEX IF NOT EXISTS idx_records_flagged_at ON records(flagged_at);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_record_id ON events(record_id);
CREATE INDEX IF NOT EXISTS idx_disputes_record_id ON disputes(record_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
