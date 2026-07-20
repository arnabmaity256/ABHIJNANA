import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, BadgeCheck, Link2, Copy, Building2, FileText, ArrowLeft, Scale, KeyRound,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { RecordStatusBadge, EmptyState } from '../components/ui.jsx';
import { useToast } from '../components/ui.jsx';
import { FlaggedClipPlayer } from '../components/FlaggedClip.jsx';
import { Seal } from '../components/Seal.jsx';
import { categoryLabel, fmtDate } from '../lib/format.js';
import { getConsoleUrl } from '../lib/domains.js';

export function Verify() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.verify(id).then(setData).catch(() => setErr(true));
  }, [id]);

  if (err) {
    return (
      <div className="container" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 620 }}>
        <EmptyState icon={FileText} title="Record not found">
          No registry record exists for <span className="mono">{id}</span>.
        </EmptyState>
        <div className="center"><Link to="/registry" className="btn btn-ghost">Browse the registry</Link></div>
      </div>
    );
  }
  if (!data) return <div className="container" style={{ padding: '60px 0' }}><div className="empty">Loading verification…</div></div>;

  const rec = data.record;
  const link = `${window.location.origin}/verify/${rec.id}`;
  const copy = () => navigator.clipboard?.writeText(link).then(() => toast('Verification link copied'), () => toast('Copy failed', 'err'));

  return (
    <div className="container fade-up" style={{ paddingTop: 34, paddingBottom: 50, maxWidth: 900 }}>
      <Link to="/registry" className="btn btn-subtle btn-sm" style={{ marginBottom: 18 }}>
        <ArrowLeft size={15} /> Public registry
      </Link>

      {/* Verification banner */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ background: 'var(--ink-900)', padding: '28px 30px', color: 'var(--on-dark)' }}>
          <div className="spread wrap gap-16">
            <div className="row gap-16">
              <Seal size={54} tone="light" />
              <div>
                <div className="row gap-8" style={{ color: '#fff' }}>
                  <BadgeCheck size={18} style={{ color: '#5fd39a' }} />
                  <strong style={{ fontSize: 17 }}>Verified registry record</strong>
                </div>
                <div className="small" style={{ color: 'var(--on-dark-muted)', marginTop: 4 }}>
                  This is an authoritative determination signed by the issuing authority.
                </div>
              </div>
            </div>
            <span className="mono small" style={{ color: 'var(--on-dark-muted)' }}>{rec.id}</span>
          </div>
        </div>

        <div className="card-bd">
          <div className="row gap-24 wrap" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 260px', maxWidth: 300 }}>
              <FlaggedClipPlayer record={rec} rounded />
            </div>
            <div className="grow" style={{ minWidth: 260 }}>
              <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
                <RecordStatusBadge status={rec.status} legalStatus={rec.legalStatus} />
                <span className="badge badge-neutral">{categoryLabel(rec.category)}</span>
                <span className="badge badge-neutral">{rec.jurisdiction}</span>
              </div>
              <h1 style={{ fontSize: 24 }}>{rec.title}</h1>
              <p style={{ color: 'var(--text-2)', marginTop: 14, lineHeight: 1.6 }}>{rec.reason}</p>
            </div>
          </div>

          <div className="hr" style={{ margin: '24px 0' }} />

          <div className="dl">
            <dt>Issuing authority</dt>
            <dd className="row gap-6"><Building2 size={14} className="muted" /> {rec.issuingAuthority}</dd>
            <dt>Case reference</dt>
            <dd className="mono">{rec.caseReference}</dd>
            <dt>Determined on</dt>
            <dd>{fmtDate(rec.flaggedAt, true)}</dd>
            <dt>Flagging officer</dt>
            <dd>{rec.flaggedBy}</dd>
            <dt>Source length</dt>
            <dd>{rec.durationSec}s · {rec.fingerprintWindows} fingerprint windows</dd>
          </div>
        </div>
      </div>

      {/* Cryptographic proof */}
      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-hd row gap-8"><KeyRound size={16} style={{ color: 'var(--navy)' }} /><strong>Cryptographic proof</strong></div>
        <div className="card-bd stack gap-16">
          <div className="row gap-12 wrap">
            <span className={`badge ${data.signatureValid ? 'badge-ok' : 'badge-danger'}`} dot>
              <ShieldCheck size={13} /> {data.signatureValid ? 'Signature valid' : 'Signature invalid'}
            </span>
            <span className={`badge ${data.audit?.valid ? 'badge-ok' : 'badge-danger'}`}>
              Audit chain {data.audit?.valid ? 'intact' : 'broken'} · {data.audit?.length} entries
            </span>
          </div>
          <div className="dl">
            <dt>Signing key</dt>
            <dd className="mono">{data.keyId}</dd>
            <dt>Content digest</dt>
            <dd className="mono" style={{ wordBreak: 'break-all' }}>{rec.contentDigest}</dd>
            <dt>Signature (ed25519)</dt>
            <dd className="mono" style={{ wordBreak: 'break-all', fontSize: 12, color: 'var(--muted)' }}>{rec.signature.slice(0, 96)}…</dd>
          </div>
        </div>
      </div>

      {/* Share + dispute */}
      <div className="card card-pad" style={{ marginTop: 22 }}>
        <div className="spread wrap gap-16">
          <div>
            <div style={{ fontWeight: 600 }}>Share this verification</div>
            <div className="small muted">Circulate the official finding to counter a viral video.</div>
          </div>
          <div className="row gap-8 wrap">
            <div className="row" style={{ position: 'relative' }}>
              <Link2 size={15} style={{ position: 'absolute', left: 11, color: 'var(--muted)' }} />
              <input className="input mono" style={{ paddingLeft: 34, width: 320, fontSize: 12.5 }} readOnly value={link} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={copy}><Copy size={14} /> Copy link</button>
          </div>
        </div>
        <div className="hr" style={{ margin: '18px 0' }} />
        <div className="row gap-8 small muted">
          <Scale size={15} />
          Believe this determination is mistaken?
          <a href={`${getConsoleUrl()}/disputes`}>File an appeal through the dispute mechanism.</a>
        </div>
      </div>
    </div>
  );
}
