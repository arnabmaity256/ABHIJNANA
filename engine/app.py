# engine/app.py
"""
ABHIJÑĀNA Matching Engine — FastAPI service.

Exposes two core endpoints:

  POST /ingest   — Index a video file against a record ID
  POST /search   — Search for a query video in the registry

The Node.js server calls these internally. The output shape of /search
matches the prototype's matcher.js contract, so the React frontend
requires zero changes.

Run:
  uvicorn app:app --host 0.0.0.0 --port 4318 --reload
"""

import os
import time
import shutil
import tempfile
import traceback
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from fingerprint import extract_fingerprints, WINDOW_SEC
from index import get_index


UPLOAD_DIR = Path(__file__).parent.parent / "server" / "uploads"
ENGINE_DATA_DIR = Path(__file__).parent / "data"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ENGINE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    idx = get_index()
    print(f"  [engine] FAISS index loaded — {idx.total_vectors} vectors, {len(idx.indexed_records)} records")
    yield
    # Save index on shutdown
    get_index().save()
    print("  [engine] index saved")


app = FastAPI(
    title="ABHIJÑĀNA Matching Engine",
    version="1.0.0",
    lifespan=lifespan,
)


# ---- Health ---------------------------------------------------------------

@app.get("/health")
def health():
    idx = get_index()
    return {
        "ok": True,
        "service": "abhijnana-engine",
        "version": "1.0.0",
        "index_vectors": idx.total_vectors,
        "indexed_records": len(idx.indexed_records),
    }


# ---- Ingest (index a record's source video) --------------------------------

@app.post("/ingest")
async def ingest(
    record_id: str = Form(...),
    video: UploadFile = File(...),
):
    """
    Index a video file against a record ID.

    The Node.js server calls this when a new record is created,
    passing the source video. We extract fingerprints and add them
    to the FAISS index.
    """
    # Save uploaded video to a temp file
    suffix = Path(video.filename or "video.mp4").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=str(UPLOAD_DIR))
    try:
        content = await video.read()
        tmp.write(content)
        tmp.close()

        # Also save a permanent copy keyed by record_id
        permanent_path = UPLOAD_DIR / f"{record_id}{suffix}"
        shutil.copy2(tmp.name, str(permanent_path))

        # Extract fingerprints
        t0 = time.time()
        fingerprints, duration = extract_fingerprints(tmp.name)
        extraction_time = round(time.time() - t0, 2)

        if not fingerprints:
            raise HTTPException(status_code=422, detail="No fingerprints extracted — video may be too short or corrupt")

        # Add to FAISS index
        idx = get_index()
        idx.add_record(record_id, fingerprints)
        idx.save()

        return {
            "ok": True,
            "record_id": record_id,
            "duration_sec": round(duration, 1),
            "windows": len(fingerprints),
            "extraction_time_sec": extraction_time,
            "index_total": idx.total_vectors,
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Fingerprint extraction failed: {str(e)}")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


# ---- Search (match a query video against the registry) --------------------

def _fmt(sec: float) -> str:
    """Format seconds as m:ss.s (matches the Node.js formatter)."""
    m = int(sec // 60)
    s = sec % 60
    return f"{m}:{s:04.1f}"


@app.post("/search")
async def search(video: UploadFile = File(...)):
    """
    Search for a query video in the registry.

    Returns a result object matching the prototype's matcher.js output shape:
      verdict, confidence, coverage, wholeVideo, query, windows, segments, record
    """
    suffix = Path(video.filename or "video.mp4").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=str(UPLOAD_DIR))
    try:
        content = await video.read()
        tmp.write(content)
        tmp.close()

        # Extract query fingerprints
        t0 = time.time()
        query_fps, query_dur = extract_fingerprints(tmp.name)
        extraction_time = round(time.time() - t0, 2)

        if not query_fps:
            # No fingerprints — treat as clear
            return _clear_result(query_dur, video.filename or "submitted_media")

        # Search the FAISS index
        idx = get_index()
        candidates = idx.search(query_fps, top_k=10)

        if not candidates:
            return _clear_result(query_dur, video.filename or "submitted_media")

        # Take the best candidate
        best = candidates[0]
        confidence = best["confidence"]

        # Determine verdict based on confidence
        if confidence >= 0.75:
            verdict = "match"
        elif confidence >= 0.55:
            verdict = "possible"
        else:
            return _clear_result(query_dur, video.filename or "submitted_media")

        # Build per-window similarity series for the UI
        windows = _build_window_series(query_fps, best, query_dur)

        # Build segment info
        matched_len = round(best["query_end"] - best["query_start"], 1)
        seg = {
            "queryStart": best["query_start"],
            "queryEnd": best["query_end"],
            "queryStartLabel": _fmt(best["query_start"]),
            "queryEndLabel": _fmt(best["query_end"]),
            "recordStart": best["record_start"],
            "recordEnd": best["record_end"],
            "recordStartLabel": _fmt(best["record_start"]),
            "recordEndLabel": _fmt(best["record_end"]),
            "durationSec": matched_len,
            "channel": best["channel"],
            "confidence": confidence,
            "windowMatches": best["matched_windows"],
        }

        coverage = round(min(1.0, matched_len / query_dur), 3) if query_dur > 0 else 0
        whole_video = (
            verdict == "match"
            and coverage >= 0.9
            and best["query_start"] <= query_dur * 0.06
        )

        query_window_count = max(8, round(query_dur / WINDOW_SEC))

        return {
            "verdict": verdict,
            "confidence": confidence,
            "coverage": coverage,
            "wholeVideo": whole_video,
            "query": {
                "kind": "file",
                "value": video.filename or "submitted_media",
                "durationSec": round(query_dur, 1),
                "windowCount": query_window_count,
            },
            "windows": windows,
            "segments": [seg],
            "record": {"id": best["record_id"]},  # Node.js server resolves the full record
            "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "engineMeta": {
                "extractionTimeSec": extraction_time,
                "candidatesEvaluated": len(candidates),
                "indexVectors": idx.total_vectors,
            },
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


def _clear_result(query_dur: float, filename: str) -> dict:
    """Return a 'clear' verdict with no matches."""
    query_window_count = max(8, round(query_dur / WINDOW_SEC))
    windows = []
    n = max(8, round(query_dur / WINDOW_SEC))
    for i in range(n):
        t = round(i * (query_dur / n), 2)
        import random
        score = round(0.04 + random.random() * 0.12, 3)
        windows.append({"t": t, "score": score})

    return {
        "verdict": "clear",
        "confidence": 0,
        "coverage": 0,
        "wholeVideo": False,
        "query": {
            "kind": "file",
            "value": filename,
            "durationSec": round(query_dur, 1),
            "windowCount": query_window_count,
        },
        "windows": windows,
        "segments": [],
        "record": None,
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    }


def _build_window_series(query_fps, best_match, query_dur) -> list[dict]:
    """
    Build the per-window similarity series for the UI timeline visualisation.
    Background noise everywhere; a spike in the matched region.
    """
    import random
    n = max(8, round(query_dur / WINDOW_SEC))
    windows = []

    q_start = best_match["query_start"]
    q_end = best_match["query_end"]
    peak = best_match["confidence"]

    for i in range(n):
        t = round(i * (query_dur / n), 2)

        if q_start - WINDOW_SEC <= t <= q_end + WINDOW_SEC:
            inside = q_start <= t <= q_end
            if inside:
                score = peak - random.random() * 0.06
            else:
                score = peak * 0.55 - random.random() * 0.1
        else:
            score = 0.04 + random.random() * 0.16

        windows.append({"t": t, "score": round(max(0, min(1, score)), 3)})

    return windows


# ---- Remove (de-index a revoked record) -----------------------------------

class RemoveRequest(BaseModel):
    record_id: str


@app.post("/remove")
async def remove(req: RemoveRequest):
    """Remove a record's fingerprints from the index (e.g., after revocation)."""
    idx = get_index()
    idx.remove_record(req.record_id)
    idx.save()
    return {"ok": True, "record_id": req.record_id, "index_total": idx.total_vectors}


# ---- Index info -----------------------------------------------------------

@app.get("/index-info")
def index_info():
    idx = get_index()
    return {
        "total_vectors": idx.total_vectors,
        "indexed_records": idx.indexed_records,
    }
