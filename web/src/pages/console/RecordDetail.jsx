import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, KeyRound, ShieldCheck, Ban, ExternalLink, Fingerprint,
  FileSignature, FlagTriangleRight, Scale, Search, ShieldAlert, Database,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast, Modal, Field, RecordStatusBadge, SeverityBadge, EmptyState } from '../../components/ui.jsx';
import { FlaggedClipPlayer } from '../../components/FlaggedClip.jsx';
import { categoryLabel, fmtDate, relTime } from '../../lib/format.js';
import { getPublicUrl } from '../../lib/domains.js';

export function RecordDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [rec, setRec] = useState(null);
  const [audit, setAudit] = useState([]);
  const [err, setErr] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [note, setNote] = useState('');

  function load() {
    api.record(id).then(setRec).catch(() => setErr(true));
    api.audit().then((a) => setAudit(a.entries.filter((e) => e.recordId === id))).catch(() => {});
  }
  useEffect(() => { load(); }, [id]);

  async function doRevoke() {
    try {
      await api.revokeRecord(id, { actor: user.name, note: note || `Record ${id} revoked by ${user.name}` });
      toast('Record revoked');
      setRevoking(false);
      setNote('');
      load();
    } catch (e) {
      toast(e.message || 'Revoke failed', 'err');
    }
  }

  if (err) return <div style={{ maxWidth: 600, margin: '40px auto' }}><EmptyState title="Record not found" /></div>;
  if (!rec) return <div className="empty">Loading record…</div>;

  const windows = Array.from({ length: Math.min(64, rec.fingerprintWindows) }, (_, i) => ((i * 53) % 40) / 40);

  return (
    <div className="fade-in" style={{ maxWidth: 960, margin: '0 auto' }}>
      <button className="btn btn-subtle btn-sm" onClick={() => navigate('/registry')} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Registry
      </button>

      <div className="spread wrap gap-16" style={{ marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
            <RecordStatusBadge status={rec.status} legalStatus={rec.legalStatus} />
            <SeverityBadge severity={rec.severity} />
            <span className="badge badge-neutral">{categoryLabel(rec.category)}</span>
          </div>
          <h1 className="page-title" style={{ fontSize: 25 }}>{rec.title}</h1>
          <div className="mono small faint" style={{ marginTop: 6 }}>{rec.id} · {rec.caseReference}</div>
        </div>
        <div className="row gap-8">
          <a href={`${getPublicUrl()}/verify/${rec.id}`} target="_blank" className="btn btn-ghost btn-sm"><ExternalLink size={14} /> Public page</a>
          {rec.status === 'active' && (
            <button className="btn btn-danger btn-sm" onClick={() => setRevoking(true)}><Ban size={14} /> Revoke</button>
          )}
        </div>
      </div>

      <div className="row gap-24 wrap" style={{ alignItems: 'flex-start' }}>
        <div className="grow stack gap-20" style={{ flex: '1 1 520px', minWidth: 0 }}>
          <div className="card card-pad">
            <div className="row gap-20 wrap" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 220px', maxWidth: 260 }}><FlaggedClipPlayer record={rec} rounded /></div>
              <div className="grow" style={{ minWidth: 220 }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Determination</div>
                <p style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{rec.reason}</p>
              </div>
            </div>
            <div className="hr" style={{ margin: '20px 0' }} />
            <div className="dl">
              <dt>Issuing authority</dt><dd className="row gap-6"><Building2 size={14} className="muted" /> {rec.issuingAuthority}</dd>
              <dt>Jurisdiction</dt><dd>{rec.jurisdiction}</dd>
              <dt>Flagging officer</dt><dd>{rec.flaggedBy}</dd>
              <dt>Determined on</dt><dd>{fmtDate(rec.flaggedAt, true)}</dd>
              <dt>Source</dt><dd className="mono">{rec.sourceLabel}</dd>
            </div>
          </div>

          {/* Fingerprint */}
          <div className="card card-pad">
            <div className="spread" style={{ marginBottom: 14 }}>
              <div className="row gap-8"><Fingerprint size={16} style={{ color: 'var(--navy)' }} /><strong className="small">Fingerprint index</strong></div>
              <span className="mono tiny muted">{rec.fingerprintWindows} windows · {rec.durationSec}s</span>
            </div>
            <div className="tl-track" style={{ height: 48 }}>
              {windows.map((h, i) => (
                <div key={i} className="tl-bar" style={{ height: `${Math.max(10, h * 100)}%`, opacity: 0.5 }} />
              ))}
            </div>
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Per-window perceptual + audio fingerprints stored in the approximate-nearest-neighbour index for sliding-window search.
            </p>
          </div>
        </div>

        {/* Side: crypto + history */}
        <div className="stack gap-20" style={{ flex: '1 1 300px', minWidth: 280 }}>
          <div className="card card-pad">
            <div className="row gap-8" style={{ marginBottom: 14 }}><KeyRound size={16} style={{ color: 'var(--navy)' }} /><strong className="small">Signature</strong></div>
            <div className="stack gap-10">
              <span className={`badge ${rec.signatureValid ? 'badge-ok' : 'badge-danger'}`} style={{ alignSelf: 'flex-start' }}>
                <ShieldCheck size={13} /> {rec.signatureValid ? 'Valid' : 'Invalid'}
              </span>
              <div>
                <div className="tiny muted">Signing key</div>
                <div className="mono small">{rec.signedBy}</div>
              </div>
              <div>
                <div className="tiny muted">Content digest</div>
                <div className="mono tiny" style={{ wordBreak: 'break-all' }}>{rec.contentDigest}</div>
              </div>
              <div>
                <div className="tiny muted">ed25519 signature</div>
                <div className="mono tiny faint" style={{ wordBreak: 'break-all' }}>{rec.signature.slice(0, 80)}…</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd"><strong className="small">Record history</strong></div>
            <div className="card-bd stack gap-14">
              {audit.length === 0 && <div className="small muted">No entries.</div>}
              {audit.map((e) => (
                <div key={e.seq} className="row gap-10" style={{ alignItems: 'flex-start' }}>
                  <HistIcon action={e.action} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{e.action.replace(/_/g, ' ').toLowerCase()}</div>
                    <div className="tiny muted">{e.detail}</div>
                    <div className="tiny faint">{relTime(e.timestamp)} · seq #{e.seq}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={revoking}
        onClose={() => setRevoking(false)}
        title="Revoke this record"
        footer={
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setRevoking(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={doRevoke}><Ban size={14} /> Confirm revocation</button>
          </div>
        }
      >
        <p className="small muted" style={{ marginBottom: 16 }}>
          Revocation is recorded in the audit ledger and retained for completeness — the record is not deleted.
          Public checks will no longer return this as a confirmed fake.
        </p>
        <Field label="Reason for revocation">
          <textarea className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Overturned on appeal APP-2026-…" />
        </Field>
      </Modal>
    </div>
  );
}

function HistIcon({ action }) {
  const map = {
    FLAG_CREATED: FlagTriangleRight, RECORD_SIGNED: FileSignature, PUBLIC_QUERY: Search,
    MATCH_RETURNED: ShieldAlert, DISPUTE_FILED: Scale, RECORD_REVOKED: Database,
  };
  const Icon = map[action] || Search;
  return (
    <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--navy)' }}>
      <Icon size={13} />
    </span>
  );
}
