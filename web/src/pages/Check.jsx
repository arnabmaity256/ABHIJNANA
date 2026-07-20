import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Link2, Search, Check as CheckIcon, FileVideo, Loader2, ShieldAlert,
  ShieldCheck, ShieldQuestion, RotateCcw, Share2, Copy, Fingerprint, ScanSearch,
  AudioLines, FileText, Building2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../components/ui.jsx';
import { TimelineTrack } from '../components/TimelineTrack.jsx';
import { FlaggedClip } from '../components/FlaggedClip.jsx';
import { VERDICT, categoryLabel, fmtDate } from '../lib/format.js';

const PROC = [
  { icon: FileVideo, label: 'Reading your video' },
  { icon: Fingerprint, label: 'Taking its fingerprint' },
  { icon: ScanSearch, label: 'Comparing against the registry' },
  { icon: CheckIcon, label: 'Preparing your result' },
];

export function Check() {
  const toast = useToast();
  const [mode, setMode] = useState('file'); // file | url
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | processing | done
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  async function run(body, label) {
    setPhase('processing');
    setStep(0);
    setResult(null);
    // animate the pipeline steps
    let s = 0;
    const timer = setInterval(() => {
      s += 1;
      setStep((prev) => Math.min(prev + 1, PROC.length - 1));
      if (s >= PROC.length) clearInterval(timer);
    }, 520);
    try {
      const [res] = await Promise.all([
        api.check(body),
        new Promise((r) => setTimeout(r, PROC.length * 520 + 240)),
      ]);
      clearInterval(timer);
      setResult({ ...res, label });
      setPhase('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      clearInterval(timer);
      toast(e.message || 'Check failed', 'err');
      setPhase('idle');
    }
  }

  function submit() {
    if (mode === 'file') {
      if (!file) return toast('Choose a video file first', 'err');
      const formData = new FormData();
      formData.append('video', file);
      run(formData, file.name);
    } else {
      if (!url.trim()) return toast('Paste a video URL first', 'err');
      const formData = new FormData();
      formData.append('url', url.trim());
      run(formData, url.trim());
    }
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setFile(null);
    setUrl('');
  }

  if (phase === 'done' && result) {
    return <Result result={result} onReset={reset} queryFile={file} queryUrl={url} />;
  }

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 40, maxWidth: 860 }}>
      <div className="page-head center">
        <div className="eyebrow">Public verification</div>
        <h1 className="page-title" style={{ fontSize: 32, marginTop: 8 }}>Check a video against the registry</h1>
        <p className="page-sub center" style={{ margin: '10px auto 0' }}>
          Submit a file or link. If any segment of it matches footage an authority has flagged,
          you'll see the exact timestamps and the official record.
        </p>
      </div>

      {phase === 'processing' ? (
        <div className="card card-pad fade-in">
          <div className="row gap-12" style={{ marginBottom: 20 }}>
            <Loader2 className="spin-icon" size={20} style={{ color: 'var(--navy)', animation: 'spin 0.9s linear infinite' }} />
            <div style={{ fontWeight: 600 }}>Analysing submission…</div>
          </div>
          <div className="proc-steps">
            {PROC.map((p, i) => (
              <div key={i} className={`proc-step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <span className="proc-check">
                  {i < step ? <CheckIcon /> : <p.icon size={13} />}
                </span>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="card card-pad">
            <div className="center" style={{ marginBottom: 20 }}>
              <div className="seg-toggle">
                <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
                  <UploadCloud size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Upload file
                </button>
                <button className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>
                  <Link2 size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Paste URL
                </button>
              </div>
            </div>

            {mode === 'file' ? (
              <div
                className={`dropzone ${drag ? 'drag' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDrag(false);
                  if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*,audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
                <div className="dropzone-icon"><UploadCloud /></div>
                {file ? (
                  <>
                    <div style={{ fontWeight: 600 }}>{file.name}</div>
                    <div className="small muted" style={{ marginTop: 4 }}>{(file.size / 1e6).toFixed(1)} MB · click to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600 }}>Drop a video here, or click to browse</div>
                    <div className="small muted" style={{ marginTop: 4 }}>MP4, MOV, WebM or audio · processed locally by the engine</div>
                  </>
                )}
              </div>
            ) : (
              <div className="stack gap-8">
                <input
                  className="input"
                  placeholder="https://…  paste a link to a video or social post"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
                <span className="field-hint">The URL's media is fetched and fingerprinted with the same pipeline used for flagged records.</span>
              </div>
            )}

            <button className="btn btn-primary btn-lg btn-block" style={{ marginTop: 20 }} onClick={submit}>
              <Search size={18} /> Check against registry
            </button>
            <p className="tiny muted center" style={{ marginTop: 12 }}>
              Open access · a no-match result never proves a video is genuine — only that it isn't in the registry.
            </p>
          </div>


        </>
      )}
    </div>
  );
}

/* ------- Result screen ------- */
function Result({ result, onReset, queryFile, queryUrl }) {
  const toast = useToast();
  const v = VERDICT[result.verdict];
  const rec = result.record;
  const matched = result.verdict !== 'clear';

  const shareUrl = rec ? `${window.location.origin}/verify/${rec.id}` : window.location.origin;
  function share() {
    navigator.clipboard?.writeText(shareUrl).then(
      () => toast('Verification link copied'),
      () => toast('Copy failed', 'err')
    );
  }

  const VIcon = result.verdict === 'match' ? ShieldAlert : result.verdict === 'possible' ? ShieldQuestion : ShieldCheck;

  return (
    <div className="container fade-up" style={{ paddingTop: 34, paddingBottom: 40, maxWidth: 900 }}>
      <button className="btn btn-subtle btn-sm" onClick={onReset} style={{ marginBottom: 18 }}>
        <RotateCcw size={15} /> Check another video
      </button>

      <div className={`verdict ${v.banner}`}>
        <div className="verdict-icon"><VIcon /></div>
        <div className="grow">
          <div className="verdict-title">{v.title}</div>
          <p style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: '64ch' }}>
            {result.verdict === 'match' && 'A competent authority has formally declared this footage to be fabricated. The matched segment and official record are shown below.'}
            {result.verdict === 'possible' && 'Part of your submission resembles flagged footage but falls in the review band — for example, a legitimate news report that lawfully shows the clip. It has been routed for human review rather than given a binary verdict.'}
            {result.verdict === 'clear' && 'No segment of your submission matches any record currently in the registry. Note this does not certify the video as authentic — only that it has not been flagged.'}
          </p>
          <div className="row gap-12 wrap" style={{ marginTop: 14 }}>
            <span className="mono small muted">Submission: {result.query.value}</span>
            {matched && <span className="small muted">· Confidence {Math.round(result.confidence * 100)}%</span>}
            {result.wholeVideo && <span className="small muted">· Entire video matches (not a sub-clip)</span>}
          </div>
        </div>
      </div>

      {matched && (
        <>
          <div style={{ marginTop: 24 }}>
            <TimelineTrack result={result} />
          </div>

          <FlaggedClip record={rec} seg={result.segments[0]} verdict={result.verdict} whole={result.wholeVideo} queryFile={queryFile} queryUrl={queryUrl} queryInfo={result.query} />

          {/* Official record */}
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-hd spread wrap gap-12">
              <div className="row gap-8">
                <FileText size={17} style={{ color: 'var(--navy)' }} />
                <strong>Official record</strong>
              </div>
              <span className="mono small muted">{rec.id}</span>
            </div>
            <div className="card-bd">
              <h3 style={{ fontSize: 20 }}>{rec.title}</h3>
              <div className="row gap-8 wrap" style={{ margin: '12px 0 18px' }}>
                <span className="badge badge-danger" style={{ textTransform: 'none' }}>{rec.legalStatus}</span>
                <span className="badge badge-neutral">{categoryLabel(rec.category)}</span>
                <span className="badge badge-neutral">{rec.jurisdiction}</span>
              </div>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{rec.reason}</p>

              <div className="dl" style={{ marginTop: 20 }}>
                <dt>Issuing authority</dt>
                <dd className="row gap-6"><Building2 size={14} style={{ color: 'var(--muted)' }} /> {rec.issuingAuthority}</dd>
                <dt>Case reference</dt>
                <dd className="mono">{rec.caseReference}</dd>
                <dt>Determined on</dt>
                <dd>{fmtDate(rec.flaggedAt, true)}</dd>
                <dt>Match channel</dt>
                <dd className="row gap-6">
                  {result.segments[0].channel === 'audio' ? <AudioLines size={14} /> : <FileVideo size={14} />}
                  {result.segments[0].channel === 'both' ? 'Video + audio' : result.segments[0].channel === 'audio' ? 'Audio only' : 'Video only'}
                </dd>
              </div>

              <div className="callout" style={{ marginTop: 20 }}>
                This determination was signed by the issuing authority (key <span className="mono">{rec.signedBy}</span>) and
                committed to a tamper-evident ledger. Digest <span className="mono">{rec.contentDigest}</span>.
              </div>
            </div>
            <div className="card-hd" style={{ borderTop: '1px solid var(--line)', borderBottom: 'none' }}>
              <div className="row gap-12 wrap">
                <Link to={`/verify/${rec.id}`} className="btn btn-ghost btn-sm"><ShieldCheck size={15} /> View verification page</Link>
                <button className="btn btn-ghost btn-sm" onClick={share}><Share2 size={15} /> Share result</button>
                <button className="btn btn-subtle btn-sm" onClick={share}><Copy size={14} /> Copy link</button>
              </div>
            </div>
          </div>
        </>
      )}

      {!matched && (
        <div className="card card-pad" style={{ marginTop: 24 }}>
          <div className="row gap-12">
            <TimelineTrackClearHint result={result} />
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTrackClearHint({ result }) {
  return (
    <div className="grow">
      <div className="section-label" style={{ marginBottom: 10 }}>What was scanned</div>
      <div className="tl-track" style={{ height: 56 }}>
        {result.windows.map((w, i) => (
          <div key={i} className="tl-bar" style={{ height: `${Math.max(6, w.score * 120)}%` }} />
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        All {result.query.windowCount} windows scored below the match threshold against every record in the registry.
        If you believe this video should be flagged, <Link to="/report">report it to the authority</Link> for review.
      </p>
    </div>
  );
}
