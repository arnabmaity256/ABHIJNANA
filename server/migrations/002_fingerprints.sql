-- 002_fingerprints.sql — Perceptual fingerprint storage for the matching engine.
-- Each record gets a set of per-window visual and audio hashes, plus
-- a serialised FAISS vector for approximate nearest-neighbour search.

CREATE TABLE IF NOT EXISTS fingerprints (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id     TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  window_index  INTEGER NOT NULL,
  timestamp_sec REAL NOT NULL,
  visual_hash   BLOB,           -- perceptual hash (pHash, 64-bit or 256-bit)
  audio_hash    BLOB,           -- chromaprint raw fingerprint
  embedding     BLOB,           -- FAISS vector (float32 array, serialised)
  channel       TEXT DEFAULT 'both',  -- 'video', 'audio', 'both'
  UNIQUE(record_id, window_index)
);

CREATE INDEX IF NOT EXISTS idx_fp_record ON fingerprints(record_id);

-- Track which records have been fully indexed by the engine.
CREATE TABLE IF NOT EXISTS index_status (
  record_id     TEXT PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | indexed | error
  error_message TEXT,
  indexed_at    TEXT,
  window_count  INTEGER DEFAULT 0
);
