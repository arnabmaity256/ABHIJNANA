-- 003_agencies.sql — Persist agencies in the database so their names can be
-- edited at runtime instead of being hardcoded in seed.js.

CREATE TABLE IF NOT EXISTS agencies (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  short         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'Designated Verification Authority',
  jurisdiction  TEXT DEFAULT 'All Zones',
  status        TEXT NOT NULL DEFAULT 'active',
  joined_at     TEXT
);
