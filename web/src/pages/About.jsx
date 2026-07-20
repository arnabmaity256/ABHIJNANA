import { Link } from 'react-router-dom';
import {
  ArrowRight, ScanSearch, ShieldCheck, Share2,
  Fingerprint, Clock, FileSignature, Scale, Lock,
} from 'lucide-react';

const STEPS = [
  {
    n: 1,
    icon: ShieldCheck,
    title: 'An authority declares a video fake',
    body: 'When a competent authority formally confirms that a video is synthetic, it is added to an official registry — a permanent record that this footage has been declared fake.',
  },
  {
    n: 2,
    icon: Fingerprint,
    title: 'The footage gets a fingerprint',
    body: 'The system takes a unique "fingerprint" of the video — a signature it can recognise again later, even if the clip is trimmed, re-encoded, or edited into a longer video.',
  },
  {
    n: 3,
    icon: ScanSearch,
    title: 'It recognises the fake wherever it reappears',
    body: 'When you check a video, ABHIJÑĀNA compares it against everything in the registry. If a known fake is hiding inside it, the system finds it — and shows you exactly where.',
  },
];

export function About() {
  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 40, maxWidth: 940 }}>
      <div className="page-head">
        <div className="eyebrow">How it works</div>
        <h1 className="page-title" style={{ fontSize: 34 }}>Recognising fakes, not guessing at them</h1>
        <p className="page-sub" style={{ fontSize: 16 }}>
          Most tools try to <em>guess</em> whether a video is fake — and they are often wrong. ABHIJÑĀNA does
          something different. Once an authority has officially declared a video fake, ABHIJÑĀNA remembers it,
          and can recognise that footage again wherever it turns up — however it has been altered.
        </p>
      </div>

      {/* Three simple steps */}
      <div className="stack gap-12" style={{ marginBottom: 40 }}>
        {STEPS.map((s) => (
          <div key={s.n} className="card card-pad">
            <div className="row gap-16" style={{ alignItems: 'flex-start' }}>
              <div className="stat-icon" style={{ margin: 0, width: 44, height: 44, background: 'var(--navy)', color: '#fff' }}>
                <s.icon />
              </div>
              <div className="grow">
                <div className="mono small faint">Step {s.n}</div>
                <h4 style={{ fontSize: 17, marginTop: 4 }}>{s.title}</h4>
                <p className="small muted" style={{ marginTop: 6 }}>{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Signature capability, in plain terms */}
      <div className="card card-pad" style={{ marginBottom: 40 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>What makes it special</div>
        <h3 style={{ fontSize: 20, marginBottom: 6 }}>It finds the fake clip hidden inside a longer video</h3>
        <p className="small muted" style={{ marginBottom: 20, maxWidth: 640 }}>
          A fake is rarely shared on its own. It gets clipped, re-shared, and spliced into other footage.
          ABHIJÑĀNA doesn't just say "this whole video is fake" — it points to the exact moment where the
          known fake appears, down to the timestamp.
        </p>
        <div className="row gap-12 wrap" style={{ justifyContent: 'space-between' }}>
          {[
            { icon: ScanSearch, t: 'Finds the clip inside a longer video', s: 'Even a few seconds is enough' },
            { icon: Clock, t: 'Shows the exact timestamp', s: 'Not just "fake" — where and when' },
            { icon: FileSignature, t: 'Results are signed', s: 'Verifiable and hard to forge' },
          ].map((x) => (
            <div key={x.t} className="row gap-12" style={{ flex: '1 1 220px' }}>
              <div className="stat-icon" style={{ margin: 0, background: 'var(--info-bg)', color: 'var(--navy)', width: 40, height: 40 }}>
                <x.icon />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{x.t}</div>
                <div className="tiny muted">{x.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust */}
      <div id="trust" style={{ scrollMarginTop: 90 }}>
        <h2 style={{ fontSize: 24, margin: '4px 0 6px' }}>Can this power be trusted?</h2>
        <p className="page-sub" style={{ marginBottom: 24 }}>
          The power to mark a video as fake is a serious one, and it could be misused. That's why
          accountability is built into ABHIJÑĀNA from the start — not added as an afterthought.
        </p>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { icon: Lock, t: 'Every action is recorded', s: 'A permanent, tamper-evident log means no decision can be quietly changed or hidden.' },
            { icon: FileSignature, t: 'Every result is signed', s: 'Each verdict carries the signature of the authority that issued it, so it cannot be faked.' },
            { icon: Scale, t: 'You can appeal', s: 'A formal process exists to challenge a "fake" designation — so genuine mistakes can be corrected.' },
          ].map((x) => (
            <div key={x.t} className="card card-pad">
              <div className="stat-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><x.icon /></div>
              <h4 style={{ fontSize: 16 }}>{x.t}</h4>
              <p className="small muted" style={{ marginTop: 6 }}>{x.s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad center" style={{ marginTop: 44, padding: '44px 32px' }}>
        <h2 style={{ fontSize: 24 }}>See it for yourself</h2>
        <p className="page-sub center" style={{ margin: '10px auto 22px' }}>Run a sample check and watch ABHIJÑĀNA locate a flagged clip inside a longer video.</p>
        <Link to="/check" className="btn btn-primary btn-lg">Check a video <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
