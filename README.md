# ABHIJÑĀNA — अभिज्ञान

**"Recognition of the Known"** — a registry & verification system for
flagged synthetic media.

ABHIJÑĀNA is **not a deepfake detector**. It is an authoritative registry: once a competent
authority formally declares a video fake, the system fingerprints it and can then recognise that
footage wherever it reappears — trimmed, re-encoded, or spliced into a longer video — and report
the **exact timestamp range** where it occurs (*sub-clip localisation*).

## Architecture

```
abhijnana/
├── server/           Node.js Express API — records, auth, audit ledger
│   └── src/
│       ├── index.js      REST routes (proxies to engine for matching)
│       ├── store.js      SQLite-backed data store
│       ├── crypto.js     ed25519 signing + SHA-256 audit hash chain (persistent keys)
│       ├── db.js         SQLite connection + migration runner
│       └── seed.js       Demo dataset
├── engine/           Python FastAPI — real matching engine
│       ├── app.py        FastAPI endpoints: /ingest, /search, /remove
│       ├── fingerprint.py  FFmpeg + pHash + chromaprint extraction
│       └── index.py      FAISS vector index (IVF, persistent)
└── web/              Vite + React SPA — professional UI
    └── src/
        ├── components/   design system, layouts, TimelineTrack
        ├── pages/        public portal
        └── pages/console/ authority console
```

### Three services

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| **API** | 4317 | Node.js / Express | Records CRUD, auth, audit ledger |
| **Engine** | 4318 | Python / FastAPI | Real video fingerprinting + FAISS matching |
| **Web** | 5317 | Vite / React | Frontend SPA |

The API server detects whether the engine is running. Since the Python matching engine is a mandatory service, the API will return HTTP 503 error responses for record indexing and video checking if it is offline.

## Quick start

### Prerequisites
- **Node.js ≥ 20**
- **Python ≥ 3.11**
- **FFmpeg** (must be on PATH)

### Install & run

```bash
# 1. Install Node.js dependencies
npm install

# 2. Set up the Python matching engine
python -m venv engine/venv
engine/venv/Scripts/pip install -r engine/requirements.txt   # Windows
# source engine/venv/bin/activate && pip install -r engine/requirements.txt  # Linux/Mac

# 3. Run everything (engine + API + web)
npm run dev
```

Then open **http://localhost:5317**.

- **Public portal** — `/` home, `/check` to verify a video, `/registry` to browse flagged records.
- **Authority console** — `/console` (sign in with demo credentials below).

### Demo credentials

| Username | Password | Role |
|----------|----------|------|
| `s.nair` | `abhijnana` | System Administrator |
| `r.deshpande` | `abhijnana` | Flagging Officer |
| `a.krishnan` | `abhijnana` | Verification Analyst |

## What's real

| Component | Status |
|-----------|--------|
| ed25519 signing of every record | ✅ Real (persistent keys) |
| SHA-256 hash-chained audit ledger | ✅ Real |
| Video fingerprint extraction (FFmpeg + pHash) | ✅ Real |
| FAISS approximate nearest-neighbour search | ✅ Real |
| Sub-clip localisation | ✅ Real |
| Audio fingerprinting (chromaprint) | ✅ Real (when fpcalc available) |
| SQLite persistence | ✅ Real |
| Auth (scrypt-hashed passwords, bearer tokens) | ✅ Real |
| Full UI, workflows, REST API | ✅ Real |

## Tech

Node.js · Express · SQLite (better-sqlite3) · Python · FastAPI · FFmpeg · OpenCV ·
imagehash (pHash) · FAISS · React 18 · React Router · Vite · ed25519/SHA-256 ·
plain CSS design system (Fraunces / Inter / Noto Sans Devanagari).

---
*Confidential concept document. Aligned with the Digital Personal Data Protection Act, 2023.*
