# engine/fingerprint.py
"""
Video fingerprint extraction pipeline.

Extracts per-window perceptual hashes (visual) and audio fingerprints from
video files using FFmpeg, OpenCV, and imagehash. Each "window" is a ~1.5s
segment of the video (matching the prototype's WINDOW_SEC constant).

Output: a list of WindowFingerprint objects, each containing:
  - window_index: ordinal position
  - timestamp_sec: start time of the window
  - visual_hash: perceptual hash (pHash, 64-bit) as bytes
  - visual_vector: float32 numpy array (for FAISS embedding)
  - audio_hash: raw chromaprint fingerprint as bytes (if available)
"""

import subprocess
import tempfile
import struct
from pathlib import Path
from dataclasses import dataclass, field

import numpy as np
import cv2
from PIL import Image
import imagehash

WINDOW_SEC = 1.5       # seconds per fingerprint window
FRAMES_PER_WINDOW = 3  # frames to sample per window, then average
PHASH_SIZE = 16         # 16×16 → 256-bit hash for higher discriminative power


@dataclass
class WindowFingerprint:
    window_index: int
    timestamp_sec: float
    visual_hash: bytes          # pHash as raw bytes
    visual_vector: np.ndarray   # float32 vector for FAISS
    audio_hash: bytes = b""     # chromaprint (may be empty)


def _phash_to_vector(h: imagehash.ImageHash) -> np.ndarray:
    """Convert an imagehash pHash to a float32 vector for FAISS."""
    bits = h.hash.flatten().astype(np.float32)
    # Map from [0, 1] to [-1, 1] so that matching 0s contribute to dot product (Hamming similarity)
    return bits * 2.0 - 1.0


def _phash_to_bytes(h: imagehash.ImageHash) -> bytes:
    """Serialise an imagehash pHash to compact bytes."""
    flat = h.hash.flatten()
    # Pack boolean array into bytes
    n = len(flat)
    byte_count = (n + 7) // 8
    result = bytearray(byte_count)
    for i, bit in enumerate(flat):
        if bit:
            result[i // 8] |= 1 << (i % 8)
    return bytes(result)


def _extract_frames(video_path: str, fps: float = 2.0) -> list[tuple[float, np.ndarray]]:
    """
    Extract frames from a video at a given FPS using FFmpeg → pipe → OpenCV.
    Returns list of (timestamp_sec, bgr_frame) tuples.
    """
    # Probe duration first
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", "-show_streams", str(video_path)],
        capture_output=True, text=True
    )
    import json
    info = json.loads(probe.stdout)

    duration = None
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            duration = float(stream.get("duration", 0))
            break
    if not duration:
        duration = float(info.get("format", {}).get("duration", 0))

    if duration <= 0:
        raise ValueError(f"Could not determine video duration for {video_path}")

    # Extract frames at target FPS using FFmpeg
    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", f"fps={fps}",
        "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-v", "quiet",
        "-"
    ]

    # We need frame dimensions — probe them
    width = height = None
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            width = int(stream["width"])
            height = int(stream["height"])
            break

    if not width or not height:
        raise ValueError("Could not determine video dimensions")

    # Scale down for efficiency (max 320px wide)
    scale_w = min(320, width)
    scale_h = int(height * (scale_w / width))
    # Ensure even dimensions
    scale_w = scale_w if scale_w % 2 == 0 else scale_w + 1
    scale_h = scale_h if scale_h % 2 == 0 else scale_h + 1

    cmd = [
        "ffmpeg", "-i", str(video_path),
        "-vf", f"fps={fps},scale={scale_w}:{scale_h}",
        "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-v", "quiet",
        "-"
    ]

    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {proc.stderr.decode()[:500]}")

    raw = proc.stdout
    frame_size = scale_w * scale_h * 3
    frame_count = len(raw) // frame_size

    frames = []
    for i in range(frame_count):
        offset = i * frame_size
        frame_bytes = raw[offset:offset + frame_size]
        frame = np.frombuffer(frame_bytes, dtype=np.uint8).reshape(scale_h, scale_w, 3)
        timestamp = i / fps
        frames.append((timestamp, frame))

    return frames, duration


def _compute_phash(frame_bgr: np.ndarray) -> imagehash.ImageHash:
    """Compute perceptual hash of a BGR frame."""
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    return imagehash.phash(pil_img, hash_size=PHASH_SIZE)


def _extract_audio_fingerprint(video_path: str) -> bytes | None:
    """
    Extract the raw chromaprint fingerprint from the audio track.
    Returns None if no audio or fpcalc is unavailable.
    """
    try:
        # Try using fpcalc (chromaprint CLI)
        proc = subprocess.run(
            ["fpcalc", "-raw", str(video_path)],
            capture_output=True, text=True, timeout=30
        )
        if proc.returncode == 0:
            for line in proc.stdout.strip().split("\n"):
                if line.startswith("FINGERPRINT="):
                    raw_str = line.split("=", 1)[1]
                    # Convert comma-separated integers to packed bytes
                    ints = [int(x) for x in raw_str.split(",")]
                    return struct.pack(f">{len(ints)}i", *ints)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Fallback: try pyacoustid
    try:
        import acoustid
        duration, fp = acoustid.fingerprint_file(str(video_path))
        if fp:
            return fp.encode() if isinstance(fp, str) else fp
    except Exception:
        pass

    return None


def extract_fingerprints(video_path: str) -> tuple[list[WindowFingerprint], float]:
    """
    Main extraction pipeline. Returns (fingerprints, duration_sec).

    Process:
    1. Extract frames at 2fps via FFmpeg
    2. Group frames into WINDOW_SEC windows
    3. Average pHash across frames in each window
    4. Extract audio fingerprint for the whole file
    """
    frames, duration = _extract_frames(video_path, fps=2.0)
    audio_fp = _extract_audio_fingerprint(video_path)

    if not frames:
        return [], duration

    # Group frames into windows
    fps = 2.0
    frames_per_window = max(1, int(WINDOW_SEC * fps))
    windows: list[WindowFingerprint] = []

    i = 0
    win_idx = 0
    while i < len(frames):
        window_frames = frames[i:i + frames_per_window]
        timestamp = window_frames[0][0]

        # Compute pHash for each frame, then pick the median
        hashes = [_compute_phash(f[1]) for f in window_frames]

        # Use first hash as representative (for stability)
        # In production you'd average the hash vectors
        representative = hashes[0]

        # Build FAISS vector from pHash bits
        vectors = [_phash_to_vector(h) for h in hashes]
        avg_vector = np.mean(vectors, axis=0).astype(np.float32)

        # Audio chunk (we store the full audio fingerprint with window 0 only)
        audio_chunk = audio_fp if win_idx == 0 else b""

        windows.append(WindowFingerprint(
            window_index=win_idx,
            timestamp_sec=round(timestamp, 2),
            visual_hash=_phash_to_bytes(representative),
            visual_vector=avg_vector,
            audio_hash=audio_chunk,
        ))

        win_idx += 1
        i += frames_per_window

    return windows, duration
