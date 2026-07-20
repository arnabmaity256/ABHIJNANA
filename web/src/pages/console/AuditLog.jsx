import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Link as LinkIcon, FlagTriangleRight, FileSignature, Search,
  ShieldAlert, Scale, Database, Filter, Flag, UserPlus,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { fmtDate } from '../../lib/format.js';

const META = {
  FLAG_CREATED: { icon: FlagTriangleRight, label: 'Record created', tone: 'var(--danger)' },
  RECORD_SIGNED: { icon: FileSignature, label: 'Signature committed', tone: 'var(--navy)' },
  PUBLIC_QUERY: { icon: Search, label: 'Public check', tone: 'var(--muted)' },
  MATCH_RETURNED: { icon: ShieldAlert, label: 'Public match returned', tone: 'var(--warn)' },
  DISPUTE_FILED: { icon: Scale, label: 'Appeal filed', tone: 'var(--warn)' },
  RECORD_REVOKED: { icon: Database, label: 'Record revoked', tone: 'var(--muted)' },
  REPORT_SUBMITTED: { icon: Flag, label: 'Public report', tone: 'var(--muted)' },
  USER_REGISTERED: { icon: UserPlus, label: 'Account registered', tone: 'var(--navy)' },
};

export function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [verification, setVerification] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.audit().then((a) => { setEntries(a.entries); setVerification(a.verification); }).catch(() => {});
  }, []);

  const shown = filter ? entries.filter((e) => e.action === filter) : entries;
  const actions = [...new Set(entries.map((e) => e.action))];

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-head">
        <div className="eyebrow">Layer 4 · Governance</div>
        <h1 className="page-title">Tamper-evident audit ledger</h1>
        <p className="page-sub">
          Every action is written to an append-only, hash-chained ledger. Each entry commits to the hash of
          the entry before it, so any retroactive edit breaks the chain from that point onward.
        </p>
      </div>

      {/* Verification banner */}
      <div className={`verdict ${verification?.valid ? 'verdict-clear' : 'verdict-match'}`} style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div className="verdict-icon" style={{ width: 44, height: 44 }}><ShieldCheck /></div>
        <div className="grow">
          <div style={{ fontWeight: 700, color: verification?.valid ? 'var(--ok)' : 'var(--danger)' }}>
            {verification?.valid ? 'Chain integrity verified' : 'Chain integrity broken'}
          </div>
          <div className="small muted" style={{ marginTop: 3 }}>
            {verification ? `${verification.length} entries · recomputed SHA-256 chain matches every stored hash` : 'Verifying…'}
          </div>
        </div>
        <span className="badge badge-ok"><LinkIcon size={12} /> SHA-256 · Merkle-anchored</span>
      </div>

      <div className="spread wrap gap-12" style={{ marginBottom: 16 }}>
        <span className="small muted">{shown.length} of {entries.length} entries</span>
        <div className="row gap-8">
          <Filter size={15} className="muted" />
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{META[a]?.label || a}</option>)}
          </select>
        </div>
      </div>

      <div className="card card-pad">
        {shown.map((e, i) => {
          const m = META[e.action] || META.PUBLIC_QUERY;
          const Icon = m.icon;
          return (
            <div className="audit-item" key={e.seq}>
              <div className="audit-rail">
                <span className="audit-node" style={{ color: m.tone }}><Icon /></span>
                {i < shown.length - 1 && <span className="audit-line" />}
              </div>
              <div className="audit-body">
                <div className="spread wrap gap-8">
                  <div className="row gap-8">
                    <strong className="small">{m.label}</strong>
                    <span className="mono tiny faint">#{e.seq}</span>
                    {e.recordId && <Link to={`/registry/${e.recordId}`} className="mono tiny">{e.recordId}</Link>}
                  </div>
                  <span className="tiny faint nowrap">{fmtDate(e.timestamp, true)}</span>
                </div>
                <div className="small muted" style={{ margin: '4px 0 8px' }}>{e.detail}</div>
                <div className="row gap-16 wrap" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <span className="tiny faint">actor</span>
                    <div className="small">{e.actor} <span className="faint">· {e.authority}</span></div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="tiny faint row gap-4"><LinkIcon size={10} className="chain-link" /> hash</div>
                    <div className="audit-hash">{e.hash}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
