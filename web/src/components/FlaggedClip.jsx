import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Lock, Share2, FileVideo, Volume2, VolumeX, Maximize } from 'lucide-react';
import { fmtDuration } from '../lib/format.js';
import { useToast } from './ui.jsx';

// Evidentiary preview of a flagged deepfake. Watermarked so the reference can't
// be re-shared as authentic.
function tone(record, verdict) {
  if (record?.status === 'revoked') return { wm: 'REVOKED', cls: 'revoked', color: 'var(--muted)' };
  if (verdict === 'possible' || (!verdict && record?.legalStatus === 'Under Review')) {
    return { wm: 'UNDER REVIEW', cls: 'possible', color: 'var(--warn)' };
  }
  return { wm: 'FLAGGED · FAKE', cls: '', color: 'var(--danger)' };
}

export function FlaggedClipPlayer({ record, seg = null, verdict, rounded = false, isQuery = false, querySrc = null, queryDur = 0 }) {
  const dur = isQuery ? queryDur : record.durationSec;
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [hasVideo, setHasVideo] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  // Auto-hide controls when playing and not active
  useEffect(() => {
    if (!playing || !hovering) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [playing, hovering, t]);

  // Fallback simulated progress sweep (1x real time)
  useEffect(() => {
    if (hasVideo || !playing) return;
    const interval = setInterval(() => {
      setT((prev) => {
        const nextT = prev + 0.1;
        if (nextT >= dur) {
          setPlaying(false);
          return 0;
        }
        return nextT;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, dur, hasVideo]);

  // Sync play/pause state with video element
  useEffect(() => {
    if (!videoRef.current || !hasVideo) return;
    if (playing) {
      videoRef.current.play().catch((err) => {
        console.error("Playback error:", err);
        setPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [playing, hasVideo]);

  const handleTimeUpdate = () => {
    if (videoRef.current && hasVideo) {
      setT(videoRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setT(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleVideoError = () => {
    setHasVideo(false);
  };

  const handleSeek = (e) => {
    const newT = parseFloat(e.target.value);
    setT(newT);
    if (videoRef.current && hasVideo) {
      videoRef.current.currentTime = newT;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (videoRef.current && hasVideo) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (videoRef.current && hasVideo) {
      videoRef.current.muted = newMuted;
      videoRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    }
  };

  const { wm, cls, color } = tone(record, verdict);
  const start = seg ? (isQuery ? seg.queryStart : seg.recordStart) : 0;
  const end = seg ? (isQuery ? seg.queryEnd : seg.recordEnd) : dur;

  const videoSrc = isQuery ? querySrc : `/api/records/${record.id}/video`;

  return (
    <div
      ref={playerRef}
      className={`clip-player premium ${rounded ? 'rounded' : ''}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={() => setShowControls(true)}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {hasVideo && (
        <video
          ref={videoRef}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleVideoError}
          onClick={() => setPlaying((p) => !p)}
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
            cursor: 'pointer',
          }}
        />
      )}

      {/* Fake watermark grid behind playback (only for registry records) */}
      {!isQuery && (
        <div className="clip-watermark" aria-hidden="true" style={{ zIndex: 2, pointerEvents: 'none' }}>
          {Array.from({ length: 6 }).map((_, i) => <span key={i}>{`${wm}   ${wm}   ${wm}`}</span>)}
        </div>
      )}

      {/* Header tags */}
      <span className={`clip-tag ${!isQuery ? 'pulse' : ''}`} style={{ zIndex: 3 }}>
        {isQuery ? <FileVideo size={12} /> : <Lock size={12} />} 
        {isQuery ? 'Your submission' : 'Restricted evidentiary media'}
      </span>
      <span className="clip-dur" style={{ zIndex: 3 }}>{fmtDuration(dur)}</span>

      {/* Center big Play/Pause toggle animation */}
      {(!playing || (hovering && showControls)) && (
        <button
          className={`clip-play-center ${playing ? 'playing' : ''}`}
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play video'}
          style={{ zIndex: 3 }}
        >
          {playing ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
        </button>
      )}

      {/* Premium Glassmorphic seek-and-control tray */}
      <div
        className={`clip-controls-tray ${showControls ? 'visible' : ''}`}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 5,
          padding: '8px 12px 12px',
          background: 'linear-gradient(to top, rgba(10,12,16,0.92) 0%, rgba(10,12,16,0.4) 60%, rgba(10,12,16,0) 100%)',
          transition: 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.28s ease',
          transform: showControls ? 'translateY(0)' : 'translateY(10px)',
          opacity: showControls ? 1 : 0,
        }}
      >
        {/* Custom interactive seek bar */}
        <div className="premium-scrubber-container" style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div className="premium-scrubber-track" style={{ position: 'relative', width: '100%', height: 5, background: 'rgba(255,255,255,0.18)', borderRadius: 3, overflow: 'hidden' }}>
            {/* Highlighted Match Region */}
            {seg && (
              <div
                className="premium-scrubber-match"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${(start / dur) * 100}%`,
                  width: `${((end - start) / dur) * 100}%`,
                  background: isQuery ? 'var(--brand)' : color,
                  boxShadow: `0 0 10px ${isQuery ? 'var(--brand)' : color}`,
                  opacity: 0.85,
                }}
              />
            )}
            {/* Progress Fill */}
            <div
              className="premium-scrubber-fill"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${(t / dur) * 100}%`,
                background: '#ffffff',
                opacity: 0.9,
              }}
            />
          </div>
          {/* Transparent inputs mapping clicks to time */}
          <input
            type="range"
            min={0}
            max={dur}
            step={0.05}
            value={t}
            onChange={handleSeek}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 6,
            }}
          />
        </div>

        {/* Lower control buttons (Play, time counters, volume controls, full-screen) */}
        <div className="spread" style={{ height: 28 }}>
          <div className="row gap-12">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="ctrl-btn"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
            </button>

            {/* Time counter */}
            <span className="mono small" style={{ color: '#e2e8f0', fontSize: '11.5px' }}>
              {fmtDuration(t)} <span style={{ color: '#64748b' }}>/</span> {fmtDuration(dur)}
            </span>

            {/* Highlight Indicator */}
            {seg && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', fontSize: '10.5px', color: '#fff', padding: '1px 6px' }}>
                Match: {fmtDuration(start)} - {fmtDuration(end)}
              </span>
            )}
          </div>

          <div className="row gap-12">
            {/* Volume controls */}
            <div className="volume-widget row gap-6" style={{ position: 'relative' }}>
              <button
                onClick={toggleMute}
                className="ctrl-btn"
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: 50,
                  height: 3,
                  cursor: 'pointer',
                  accentColor: '#fff',
                }}
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="ctrl-btn"
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Maximize size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Full card used on the Check result — player plus context and an action.
export function FlaggedClip({ record, seg, verdict, whole, queryFile, queryUrl, queryInfo }) {
  const toast = useToast();
  const [queryObjectUrl, setQueryObjectUrl] = useState(null);

  useEffect(() => {
    if (queryFile) {
      const u = URL.createObjectURL(queryFile);
      setQueryObjectUrl(u);
      return () => URL.revokeObjectURL(u);
    }
  }, [queryFile]);

  return (
    <div className="card" style={{ marginTop: 24, overflow: 'hidden' }}>
      <div className="card-hd spread">
        <div className="row gap-8">
          <FileVideo size={17} style={{ color: 'var(--muted)' }} />
          <strong>Match comparison</strong>
        </div>
        <span className="mono small muted">{record.id}</span>
      </div>

      <div className="card-bd" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Left: User's Submission */}
          <div>
            <div className="section-label" style={{ marginBottom: 10, fontSize: '11px', color: 'var(--muted)' }}>Your submission</div>
            {queryObjectUrl || queryUrl ? (
              <FlaggedClipPlayer 
                record={record} 
                seg={seg} 
                verdict={verdict} 
                rounded 
                isQuery 
                querySrc={queryObjectUrl || queryUrl} 
                queryDur={queryInfo?.durationSec || 0} 
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--line-strong)',
                  background: 'var(--ink-900)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--on-dark-muted)',
                  fontSize: '13px',
                }}
              >
                Preview unavailable
              </div>
            )}
          </div>

          {/* Right: Flagged reference from registry */}
          <div>
            <div className="section-label" style={{ marginBottom: 10, fontSize: '11px', color: 'var(--muted)' }}>Matched registry record</div>
            <FlaggedClipPlayer record={record} seg={seg} verdict={verdict} rounded />
          </div>
        </div>

        <div className="hr" style={{ margin: '16px 0 20px' }} />

        <p className="small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
          {whole
            ? 'This is the flagged deepfake in full — the entire video matches this registered record.'
            : `The highlighted ${seg ? `${seg.durationSec.toFixed(1)}s ` : ''}span on the scrubber shows the exact portion of this flagged clip that matches your submission.`}
          {' '}The reference is watermarked so it cannot be re-shared as authentic.
        </p>
        <div className="row gap-10 wrap" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => toast('Reporting to the issuing authority is available to authorised reviewers.')}>
            <Share2 size={14} /> Report a reappearance
          </button>
        </div>
      </div>
    </div>
  );
}
