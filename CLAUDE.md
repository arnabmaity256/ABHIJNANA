# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ABHIJÑĀNA is an authoritative **registry & verification system for flagged synthetic media**.
It is *not* a deepfake detector. Once an authority formally declares a video fake, the system
fingerprints it and can later recognise that footage wherever it reappears — trimmed, re-encoded,
or spliced into a longer video — reporting the exact timestamp range (**sub-clip localisation**).

**Three-service architecture:**
- **Node.js API** (port 4317) — records, auth, audit chain, SQLite persistence
- **Python Engine** (port 4318) — real video fingerprinting + FAISS matching
- **React Web** (port 5317) — public portal + authority console SPA

The API auto-detects the engine: if running → real matching; if not → simulated fallback.
Crypto is **real** — records are ed25519-signed (persistent keys) and the audit log is a genuine
SHA-256 hash chain.

## Commands

Run from the repo root (npm workspaces: `server`, `web`).

```bash
npm install                # installs both Node.js workspaces
python -m venv engine/venv # create Python virtual environment
engine/venv/Scripts/pip install -r engine/requirements.txt  # Windows

npm run dev:full    # runs Engine (:4318), API (:4317), and Web (:5317) concurrently
npm run dev         # runs API + Web only (engine fallback: simulated matcher)
npm run dev:server  # API alone
npm run dev:web     # Web alone
npm run dev:engine  # Python engine alone
npm run build       # builds the web SPA
```

Open **http://localhost:5317**. Requires Node >= 20, Python >= 3.11, FFmpeg on PATH.
There is **no test suite, linter, or formatter** configured yet.

## Architecture

### Server (`server/src/`) — Express, ESM, SQLite

Key invariant: **only source data is persisted; all cryptographic and derived fields are recomputed
on every read.** This keeps signatures and the hash chain valid across restarts.

- `db.js` — SQLite connection via `better-sqlite3`. WAL mode. Numbered SQL migrations in
  `server/migrations/` applied on startup. Tracks applied migrations in `_migrations` table.
- `store.js` — data store backed by SQLite. Maintains the same export interface as the prototype
  (all API routes unchanged). Row ↔ object mapping between snake_case SQL and camelCase JS.
  Sessions are persistent (survive restarts).
- `crypto.js` — real ed25519 signing with **persistent keys** loaded from `server/keys/`.
  Generated once on first run, then stable across restarts. Canonical JSON serialization for
  reproducible signatures. scrypt-hashed passwords.
- `matcher.js` — **simulated** engine (fallback). Deterministic PRNG-based; used when the Python
  engine is offline. **Its output shape is the contract the real engine matches.**
- `index.js` — REST routes under `/api`. `POST /api/check` and `POST /api/records` now support
  multipart file uploads. The server proxies matching requests to the Python engine if available.
- `seed.js` — India-centric demo dataset with a single operating authority.

### Engine (`engine/`) — Python, FastAPI, FAISS

The real matching engine, replacing the simulated `matcher.js`.

- `fingerprint.py` — video fingerprint extraction pipeline:
  - FFmpeg → frame extraction at 2fps (scaled to 320px wide)
  - imagehash → 16×16 perceptual hash (pHash) per 1.5s window
  - chromaprint/fpcalc → audio fingerprint (whole file)
  - Output: `WindowFingerprint` objects with visual hash bytes + float32 FAISS vectors
- `index.py` — FAISS similarity index:
  - `IndexFlatIP` (cosine similarity via L2-normalised inner product)
  - Auto-upgrades to `IndexIVFFlat` at >1000 vectors for sub-linear search
  - Thread-safe, persistent to disk (`engine/data/faiss.index` + `faiss_meta.json`)
  - Segment aggregation: per-window matches → contiguous segment candidates
- `app.py` — FastAPI service:
  - `POST /ingest` — index a record's source video
  - `POST /search` — query a video against the registry
  - `POST /remove` — de-index a revoked record
  - Output shape identical to `matcher.js` contract (verdict, confidence, windows, segments)

### Web (`web/src/`) — React 18, React Router 6, Vite

Two distinct surfaces:

- **Public portal** (`PublicLayout`): `/` Home, `/check`, `/report`, `/registry`, `/about`, `/verify/:id`.
- **Authority console** (`ConsoleLayout`): `/console` dashboard, flag, registry, reports, audit, disputes, team.

Auth is username + password → bearer token. `ConsoleLayout` redirects to login when unauthenticated.
Account creation is admin-only.

## Conventions

- ESM throughout (`"type": "module"` in both Node workspaces).
- Server IDs: records `ABJ-2026-NNNNNN`, disputes `APP-2026-NNNN`, audit events `EVT-<ts>-<n>`.
- SQLite database at `server/data/abhijnana.db` (gitignored). Delete it or `POST /api/reset` to reseed.
- Signing keys at `server/keys/` (gitignored, auto-generated on first run).
- Video uploads at `server/uploads/` (gitignored).
- Python venv at `engine/venv/` (gitignored).
- FAISS index at `engine/data/` (gitignored).
- Ports 4317 (API), 4318 (Engine), 5317 (Web).
