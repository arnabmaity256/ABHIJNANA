# engine/index.py
"""
FAISS-based similarity index for sub-clip localisation.

Manages a persistent FAISS index that maps visual fingerprint vectors to
(record_id, window_index) pairs. Supports:

  - add_record: index all windows of a registered record
  - search: given a query video's fingerprints, find matching record windows
  - remove_record: de-index a revoked record
  - save / load: persist the index to disk

The index uses an IVF (Inverted File) structure for scalable sub-linear search
when the registry grows large. Falls back to flat (brute-force) when the index
is small (< 1000 vectors).
"""

import json
import threading
from pathlib import Path
from dataclasses import dataclass

import numpy as np
import faiss

from fingerprint import WindowFingerprint, PHASH_SIZE

# Vector dimension = PHASH_SIZE^2 (256 for 16×16 hash)
VECTOR_DIM = PHASH_SIZE * PHASH_SIZE

# IVF parameters — used when the index is large enough
NLIST = 32         # number of Voronoi cells
NPROBE = 8         # cells to search at query time

# Paths
DATA_DIR = Path(__file__).parent / "data"
INDEX_PATH = DATA_DIR / "faiss.index"
META_PATH = DATA_DIR / "faiss_meta.json"


@dataclass
class IndexEntry:
    """Metadata for a single vector in the FAISS index."""
    record_id: str
    window_index: int
    timestamp_sec: float


class FingerprintIndex:
    """Thread-safe FAISS index with record-level management."""

    def __init__(self):
        self._lock = threading.Lock()
        self._index: faiss.Index | None = None
        self._entries: list[IndexEntry] = []
        self._record_ranges: dict[str, tuple[int, int]] = {}  # record_id → (start, end) in entries
        self._dirty = False

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._load_or_create()

    def _load_or_create(self):
        """Load existing index from disk or create a new flat one."""
        if INDEX_PATH.exists() and META_PATH.exists():
            try:
                self._index = faiss.read_index(str(INDEX_PATH))
                meta = json.loads(META_PATH.read_text())
                self._entries = [IndexEntry(**e) for e in meta["entries"]]
                self._record_ranges = meta.get("record_ranges", {})
                # Convert string keys back
                self._record_ranges = {k: tuple(v) for k, v in self._record_ranges.items()}
                return
            except Exception as e:
                print(f"  [index] failed to load index, rebuilding: {e}")

        # Create a new flat index
        self._index = faiss.IndexFlatIP(VECTOR_DIM)  # Inner Product (cosine after L2-norm)
        self._entries = []
        self._record_ranges = {}

    def _maybe_upgrade_to_ivf(self):
        """
        If we have enough vectors, rebuild as IVF for faster search.
        Only called during add_record when crossing the threshold.
        """
        n = self._index.ntotal
        if n < 1000 or isinstance(self._index, faiss.IndexIVFFlat):
            return

        # Rebuild all vectors into an IVF index
        vectors = np.zeros((n, VECTOR_DIM), dtype=np.float32)
        for i in range(n):
            vectors[i] = self._index.reconstruct(i)

        quantizer = faiss.IndexFlatIP(VECTOR_DIM)
        ivf = faiss.IndexIVFFlat(quantizer, VECTOR_DIM, min(NLIST, n // 10))
        ivf.train(vectors)
        ivf.add(vectors)
        ivf.nprobe = NPROBE
        self._index = ivf
        print(f"  [index] upgraded to IVF index ({n} vectors, {min(NLIST, n // 10)} cells)")

    def add_record(self, record_id: str, fingerprints: list[WindowFingerprint]):
        """
        Add all fingerprint windows of a record to the index.
        Vectors are L2-normalised before insertion (so inner product = cosine sim).
        """
        if not fingerprints:
            return

        with self._lock:
            # Remove old entry if re-indexing
            if record_id in self._record_ranges:
                self._remove_record_internal(record_id)

            vectors = np.array([fp.visual_vector for fp in fingerprints], dtype=np.float32)
            # L2-normalise for cosine similarity via inner product
            faiss.normalize_L2(vectors)

            start = self._index.ntotal
            self._index.add(vectors)
            end = self._index.ntotal

            new_entries = [
                IndexEntry(
                    record_id=record_id,
                    window_index=fp.window_index,
                    timestamp_sec=fp.timestamp_sec,
                )
                for fp in fingerprints
            ]
            self._entries.extend(new_entries)
            self._record_ranges[record_id] = (start, end)
            self._dirty = True

            self._maybe_upgrade_to_ivf()

    def search(
        self,
        query_fingerprints: list[WindowFingerprint],
        top_k: int = 5,
    ) -> list[dict]:
        """
        Search for matching record windows given query fingerprints.

        For each query window, finds the top_k nearest neighbours in the index.
        Then aggregates results by record to produce segment-level matches.

        Returns a list of match candidates:
          {
            record_id, confidence, query_start, query_end,
            record_start, record_end, matched_windows, channel
          }
        """
        if not query_fingerprints or self._index.ntotal == 0:
            return []

        with self._lock:
            vectors = np.array([fp.visual_vector for fp in query_fingerprints], dtype=np.float32)
            faiss.normalize_L2(vectors)

            # Search
            k = min(top_k, self._index.ntotal)
            distances, indices = self._index.search(vectors, k)

            # Collect per-record window matches
            # record_id → list of (query_win_idx, record_win_idx, similarity)
            record_matches: dict[str, list[tuple[int, int, float]]] = {}

            for q_idx in range(len(query_fingerprints)):
                for rank in range(k):
                    idx = int(indices[q_idx][rank])
                    if idx < 0 or idx >= len(self._entries):
                        continue
                    sim = float(distances[q_idx][rank])
                    entry = self._entries[idx]

                    if entry.record_id not in record_matches:
                        record_matches[entry.record_id] = []
                    record_matches[entry.record_id].append((q_idx, entry.window_index, sim))

            return self._aggregate_matches(query_fingerprints, record_matches)

    def _aggregate_matches(
        self,
        query_fps: list[WindowFingerprint],
        record_matches: dict[str, list[tuple[int, int, float]]],
    ) -> list[dict]:
        """
        Aggregate per-window matches into contiguous segments per record.

        A segment is a run of consecutive (or near-consecutive) matching windows
        with similarity above a threshold.
        """
        SIMILARITY_THRESHOLD = 0.65  # minimum cosine similarity to count as a match
        GAP_TOLERANCE = 2            # max gap in window indices before breaking a segment

        candidates = []

        for record_id, matches in record_matches.items():
            # Filter by similarity threshold
            good = [(q, r, s) for q, r, s in matches if s > SIMILARITY_THRESHOLD]
            if not good:
                continue

            # Sort by query window index
            good.sort(key=lambda x: x[0])

            # Group into contiguous segments
            segments = []
            current_seg = [good[0]]

            for i in range(1, len(good)):
                prev_q = current_seg[-1][0]
                curr_q = good[i][0]
                if curr_q - prev_q <= GAP_TOLERANCE:
                    current_seg.append(good[i])
                else:
                    if len(current_seg) >= 3:  # at least 3 windows (4.5s) for a valid segment
                        segments.append(current_seg)
                    current_seg = [good[i]]

            if len(current_seg) >= 3:
                segments.append(current_seg)

            for seg in segments:
                q_indices = [m[0] for m in seg]
                r_indices = [m[1] for m in seg]
                sims = [m[2] for m in seg]

                q_start_win = min(q_indices)
                q_end_win = max(q_indices)
                r_start_win = min(r_indices)
                r_end_win = max(r_indices)

                from fingerprint import WINDOW_SEC
                candidates.append({
                    "record_id": record_id,
                    "confidence": round(float(np.mean(sims)), 3),
                    "query_start": query_fps[q_start_win].timestamp_sec,
                    "query_end": round(query_fps[q_end_win].timestamp_sec + WINDOW_SEC, 1),
                    "record_start": round(r_start_win * WINDOW_SEC, 1),
                    "record_end": round((r_end_win + 1) * WINDOW_SEC, 1),
                    "matched_windows": len(seg),
                    "channel": "video",  # audio matching adds 'audio' or 'both'
                })

        # Sort by confidence descending
        candidates.sort(key=lambda x: x["confidence"], reverse=True)
        return candidates

    def _remove_record_internal(self, record_id: str):
        """
        Remove a record from the index. This rebuilds the index without
        that record's vectors (FAISS doesn't support direct removal).
        """
        if record_id not in self._record_ranges:
            return

        # Collect all vectors except the removed record's
        remaining_entries = []
        remaining_vectors = []

        for i, entry in enumerate(self._entries):
            if entry.record_id != record_id:
                vec = self._index.reconstruct(i)
                remaining_entries.append(entry)
                remaining_vectors.append(vec)

        # Rebuild
        self._index = faiss.IndexFlatIP(VECTOR_DIM)
        if remaining_vectors:
            vecs = np.array(remaining_vectors, dtype=np.float32)
            self._index.add(vecs)

        self._entries = remaining_entries
        del self._record_ranges[record_id]

        # Rebuild record_ranges
        self._record_ranges = {}
        current_record = None
        start = 0
        for i, e in enumerate(self._entries):
            if e.record_id != current_record:
                if current_record is not None:
                    self._record_ranges[current_record] = (start, i)
                current_record = e.record_id
                start = i
        if current_record is not None:
            self._record_ranges[current_record] = (start, len(self._entries))

    def remove_record(self, record_id: str):
        """Thread-safe record removal."""
        with self._lock:
            self._remove_record_internal(record_id)
            self._dirty = True

    def save(self):
        """Persist the index and metadata to disk."""
        with self._lock:
            if not self._dirty:
                return
            faiss.write_index(self._index, str(INDEX_PATH))
            meta = {
                "entries": [
                    {"record_id": e.record_id, "window_index": e.window_index, "timestamp_sec": e.timestamp_sec}
                    for e in self._entries
                ],
                "record_ranges": {k: list(v) for k, v in self._record_ranges.items()},
            }
            META_PATH.write_text(json.dumps(meta))
            self._dirty = False

    @property
    def total_vectors(self) -> int:
        return self._index.ntotal if self._index else 0

    @property
    def indexed_records(self) -> list[str]:
        return list(self._record_ranges.keys())


# Module-level singleton
_index: FingerprintIndex | None = None


def get_index() -> FingerprintIndex:
    global _index
    if _index is None:
        _index = FingerprintIndex()
    return _index
