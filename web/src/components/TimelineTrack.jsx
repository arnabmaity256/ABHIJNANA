import { ArrowRight } from 'lucide-react';
import { fmtDuration } from '../lib/format.js';

// Visualises sub-clip localisation: the query video as a strip of per-window
// similarity bars, with the matched region boxed and its in-video timestamps
// mapped onto the original flagged record.
export function TimelineTrack({ result }) {
  const { windows, segments, query } = result;
  const dur = query.durationSec;
  const seg = segments[0];
  const possible = result.verdict === 'possible';
  const whole = !!result.wholeVideo;
  const barClass = possible ? 'hit-possible' : 'hit';

  const inSeg = (t) => seg && t >= seg.queryStart && t <= seg.queryEnd;
  const maxScore = Math.max(0.001, ...windows.map((w) => w.score));

  return (
    <div className="tl">
      <div className="spread wrap gap-12" style={{ marginBottom: 16 }}>
        <div>
          <div className="section-label">{whole ? 'Full-length match' : 'Sub-clip localisation'}</div>
          <div className="muted small" style={{ marginTop: 4 }}>
            {whole
              ? `Every one of the ${query.windowCount} windows across your ${fmtDuration(dur)} submission matches the flagged record`
              : `Per-window similarity across your ${fmtDuration(dur)} submission (${query.windowCount} windows scanned)`}
          </div>
        </div>
        <div className="tl-legend">
          <span className="k"><span className="tl-swatch" style={{ background: 'var(--navy-400)', opacity: 0.4 }} /> No match</span>
          <span className="k">
            <span className="tl-swatch" style={{ background: possible ? 'var(--warn)' : 'var(--danger)' }} /> Matched window
          </span>
        </div>
      </div>

      <div className="tl-track-wrap">
        <div className="tl-track">
          {windows.map((w, i) => (
            <div
              key={i}
              className={`tl-bar ${inSeg(w.t) ? barClass : ''}`}
              style={{ height: `${Math.max(6, (w.score / maxScore) * 100)}%` }}
              title={`${fmtDuration(w.t)} · similarity ${(w.score * 100).toFixed(0)}%`}
            />
          ))}
        </div>

        {seg && (
          <div
            className={`tl-segment ${possible ? 'possible' : ''}`}
            style={{
              left: `${(seg.queryStart / dur) * 100}%`,
              width: `${((seg.queryEnd - seg.queryStart) / dur) * 100}%`,
            }}
          >
            <span className="tl-seg-flag">{whole ? 'ENTIRE VIDEO' : 'FLAGGED CLIP'}</span>
          </div>
        )}
      </div>

      <div className="tl-axis">
        <span>0:00</span>
        <span>{fmtDuration(dur / 2)}</span>
        <span>{fmtDuration(dur)}</span>
      </div>

      {seg && whole && (
        <p className="tl-caption">
          The <strong>entire {seg.durationSec.toFixed(1)}s</strong> submission matches the flagged record
          end-to-end{seg.channel === 'audio' ? ' on the audio channel' : seg.channel === 'video' ? ' on the video channel' : ' on both video and audio'}.
          This is not a fragment embedded in other footage — the whole video is the registered fake.
        </p>
      )}

      {seg && !whole && (
        <>
          <p className="tl-caption">
            A flagged segment of <strong>{seg.durationSec.toFixed(1)}s</strong> was located between{' '}
            <strong className="mono">{seg.queryStartLabel}</strong> and{' '}
            <strong className="mono">{seg.queryEndLabel}</strong> in your submission
            {seg.channel === 'audio' ? ' (audio channel)' : seg.channel === 'video' ? ' (video channel)' : ' (video + audio)'}.
          </p>

          <div className="map-row">
            <div className="map-box">
              <div className="lab">In your video</div>
              <div className="val">{seg.queryStartLabel} – {seg.queryEndLabel}</div>
            </div>
            <div className="map-arrow"><ArrowRight size={22} /></div>
            <div className="map-box">
              <div className="lab">In the flagged record</div>
              <div className="val">{seg.recordStartLabel} – {seg.recordEndLabel}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
