import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Fingerprint, Scan, Gavel, FileSignature, ArrowRight,
  Database, AudioLines, ScanSearch, Check as CheckIcon,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { Seal } from '../components/Seal.jsx';

const STEPS = [
  { icon: Gavel, lane: 'authority', title: 'An authority flags', body: 'A verified body formally marks a video as fake — with case reference, jurisdiction and legal basis.' },
  { icon: Fingerprint, lane: 'authority', title: 'It is fingerprinted', body: 'The clip is cut into short overlapping windows; a robust perceptual + audio fingerprint is computed for each.' },
  { icon: FileSignature, lane: 'authority', title: 'Signed & committed', body: 'The record is signed by the issuing authority and written to an append-only, tamper-evident ledger.' },
  { icon: ScanSearch, lane: 'public', title: 'Anyone can check', body: 'A citizen submits a video. A sliding-window search finds any flagged segment inside it — to the second.' },
];

const XFORMS = [
  { op: 'trim → 8.4s clip', note: 'cropped from a 3-minute source' },
  { op: 're-encode ×3', note: 'compressed, watermarked, re-uploaded' },
  { op: 'splice into 4:12 video', note: 'buried mid-way through' },
];

export function Home() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const nf = (n) => (n != null ? n.toLocaleString('en-IN') : '—');

  return (
    <>
      {/* ---- Hero: thesis on the left, a recognition scope on the right ---- */}
      <section className="lander">
        <div className="container">
          <div className="lander-inner">
            <div className="lander-lede">
              <h1>Declared once. Recognised everywhere.</h1>
              <div style={{ marginTop: 16, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-bright)', fontWeight: 600 }}>
                <span className="deva" style={{ marginRight: 6, fontSize: 14, color: '#fff' }}>अभिज्ञान</span>
                — Recognition of the known
              </div>
              <p className="lander-lead">
                ABHIJÑĀNA is not a deepfake detector. It is an authoritative registry: once a competent
                authority declares a video fake, the system recognises that footage wherever it reappears —
                trimmed, re-encoded, or spliced into a longer video — and returns the exact timestamp.
              </p>
              <div className="lander-actions">
                <Link to="/check" className="btn btn-gold btn-lg"><Search size={18} /> Check a video</Link>
                <Link to="/about" className="btn btn-ghost btn-lg" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                  How it works <ArrowRight size={17} />
                </Link>
              </div>

              <div className="lander-contrast">
                <div className="cx">
                  <span className="mk">Detector</span>
                  <span>guesses whether a video <em>looks</em> fake — a probability.</span>
                </div>
                <div className="cx">
                  <span className="mk">ABHIJÑĀNA</span>
                  <span>confirms whether an authority has <em className="hot">declared</em> it fake — a verifiable fact, located to the second.</span>
                </div>
              </div>
            </div>

            <ScopePanel />
          </div>
        </div>

        {/* status strip — welded to the hero, not floating cards */}
        <div className="container">
          <div className="lander-status">
            <div className="cell">
              <span className="v">{nf(stats?.activeRecords)}</span>
              <span className="l">Active flagged records</span>
            </div>
            <div className="cell">
              <span className="v">{nf(stats?.indexedWindows)}</span>
              <span className="l">Indexed fingerprint windows</span>
            </div>
            <div className="cell">
              <span className="v">{nf(stats?.publicQueries)}</span>
              <span className="l">Public checks served</span>
            </div>
            <div className="cell">
              <span className="v">{stats ? Object.keys(stats.byCategory).length : '—'}<span className="u"> cat.</span></span>
              <span className="l">Threat categories tracked</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Pipeline rail: two lanes converging on one shared registry ---- */}
      <section className="container" style={{ marginTop: 84 }}>
        <div className="eyebrow">The mechanism</div>
        <h2 style={{ fontSize: 30, marginTop: 10, maxWidth: '20ch' }}>
          Two sides, one registry — built through an identical fingerprinting pipeline.
        </h2>

        <div className="pipe-lanes" style={{ marginTop: 26 }}>
          <span className="pipe-lane-tag"><span className="sw" style={{ background: 'var(--navy)' }} /> Authority side</span>
          <span className="pipe-lane-tag"><span className="sw" style={{ background: 'var(--gold-bright)' }} /> Public side</span>
        </div>

        <div className="pipeline">
          <div className="pipe-line" />
          <div className="pipe-track">
            {STEPS.map((s, i) => (
              <div className={`pipe-stage ${s.lane}`} key={s.title}>
                <div className="pipe-node"><s.icon /></div>
                <span className="pipe-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="pipe-title">{s.title}</div>
                <p className="pipe-body">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="center">
            <span className="pipe-registry"><Database /> both sides resolve against the same signed registry</span>
          </div>
        </div>
      </section>

      {/* ---- Signature capability: sub-clip localisation & transform tolerance ---- */}
      <section className="container" style={{ marginTop: 88 }}>
        <div className="card" style={{ overflow: 'hidden', background: 'var(--ink-900)', border: 'none' }}>
          <div className="row wrap" style={{ alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 400px', padding: '46px 44px' }}>
              <div className="eyebrow" style={{ color: 'var(--gold-bright)' }}>The defining capability</div>
              <h2 style={{ color: '#fff', fontSize: 30, marginTop: 12 }}>Sub-clip localisation</h2>
              <p style={{ color: 'var(--on-dark-muted)', marginTop: 16, fontSize: 15.5, lineHeight: 1.65, maxWidth: '46ch' }}>
                Because every video is stored as per-window fingerprints — not one whole-video hash — a
                flagged clip stays recognisable after it has been altered and hidden inside a long,
                otherwise-innocent video. Same source clip, put through anything:
              </p>
              <div className="row gap-16 wrap" style={{ marginTop: 26 }}>
                {[
                  { icon: Scan, t: 'Trimmed & embedded' },
                  { icon: Fingerprint, t: 'Transform-tolerant' },
                  { icon: AudioLines, t: 'Independent audio' },
                ].map((f) => (
                  <div key={f.t} className="row gap-8" style={{ color: 'var(--on-dark)', fontSize: 13.5 }}>
                    <f.icon size={16} style={{ color: 'var(--gold-bright)' }} /> {f.t}
                  </div>
                ))}
              </div>
              <Link to="/check" className="btn btn-gold" style={{ marginTop: 30 }}>
                Try it now <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{ flex: '1 1 340px', minWidth: 0, background: 'var(--ink-800)', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 30 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--on-dark-faint)', marginBottom: 14, letterSpacing: '0.04em' }}>
                ONE FLAGGED CLIP · STILL RECOGNISED
              </div>
              <div className="xform">
                {XFORMS.map((x) => (
                  <div key={x.op} className="xform-row">
                    <div style={{ minWidth: 0 }}>
                      <div className="op">{x.op}</div>
                      <div className="tiny" style={{ color: 'var(--on-dark-faint)', marginTop: 3 }}>{x.note}</div>
                    </div>
                    <span className="ok"><CheckIcon /> match</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="container" style={{ marginTop: 88 }}>
        <div className="card card-pad center" style={{ padding: '54px 32px' }}>
          <h2 style={{ fontSize: 28 }}>Doubt a video? Check it against the record.</h2>
          <p className="page-sub center" style={{ margin: '12px auto 26px' }}>
            Open access, instant result, and every match points back to an official, signed determination.
          </p>
          <div className="row gap-12" style={{ justifyContent: 'center' }}>
            <Link to="/check" className="btn btn-primary btn-lg"><Search size={17} /> Check a video</Link>
            <Link to="/registry" className="btn btn-ghost btn-lg">Browse the public registry</Link>
          </div>
        </div>
      </section>
    </>
  );
}

/* The hero's live "scope": the product's core moment — a flagged clip located
   inside a longer query video — rendered as an instrument readout. */
function ScopePanel() {
  const bars = Array.from({ length: 44 }, (_, i) => (i >= 16 && i <= 26 ? 0.92 : 0.1 + ((i * 37) % 20) / 130));
  return (
    <div className="scope">
      <div className="scope-body">
        <div className="scope-track">
          {bars.map((h, i) => (
            <div key={i} className={`scope-bar ${h > 0.7 ? 'hit' : ''}`} style={{ height: `${Math.max(6, h * 100)}%` }} />
          ))}
          <div className="scope-region" style={{ left: '36.3%', width: '25%' }}>
            <span className="flag">0:34 – 0:42</span>
          </div>
        </div>
        <div className="scope-axis"><span>0:00</span><span>1:00</span><span>2:00</span></div>
        <div className="scope-verdict">
          <span className="mark" />
          <span><strong>Match</strong> — flagged 8.4s clip located in record ABJ-2026-000118, 96% confidence.</span>
        </div>
      </div>
    </div>
  );
}
