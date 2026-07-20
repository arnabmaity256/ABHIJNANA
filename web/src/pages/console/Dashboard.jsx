import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database, Layers, Activity, Scale, FlagTriangleRight, ArrowRight, ArrowUpRight,
  FileSignature, Search, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { categoryLabel, fmtDate, relTime } from '../../lib/format.js';
import { RecordStatusBadge } from '../../components/ui.jsx';

const ACTION_LABEL = {
  FLAG_CREATED: 'Record created',
  RECORD_SIGNED: 'Signature committed',
  PUBLIC_QUERY: 'Public check',
  MATCH_RETURNED: 'Public match returned',
  DISPUTE_FILED: 'Appeal filed',
  RECORD_REVOKED: 'Record revoked',
};

function StatCard({ icon: Icon, value, label, trend }) {
  return (
    <div className="stat-card">
      <div className="spread">
        <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--navy)' }}><Icon /></div>
        {trend && <span className="badge badge-neutral tiny">{trend}</span>}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.records().then((r) => setRecords(r.slice(0, 5))).catch(() => {});
    api.audit().then((a) => setAudit(a.entries.slice(0, 6))).catch(() => {});
  }, []);

  const cats = stats ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]) : [];
  const maxCat = cats.length ? Math.max(...cats.map((c) => c[1])) : 1;

  return (
    <div className="fade-in">
      <div className="spread wrap gap-16 page-head">
        <div>
          <div className="eyebrow">Authority console</div>
          <h1 className="page-title">Welcome back, {user?.name.split(' ').slice(-1)[0]}</h1>
          <p className="page-sub">Registry overview for {user?.agencyName}.</p>
        </div>
        <Link to="/flag" className="btn btn-primary"><FlagTriangleRight size={16} /> Flag a video</Link>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={Database} tone={{ bg: 'var(--info-bg)', fg: 'var(--info)' }} value={stats?.activeRecords ?? '—'} label="Active flagged records" trend="+2 this week" />
        <StatCard icon={Layers} tone={{ bg: 'var(--gold-soft)', fg: 'var(--gold)' }} value={stats ? stats.indexedWindows.toLocaleString('en-IN') : '—'} label="Indexed fingerprint windows" />
        <StatCard icon={Activity} tone={{ bg: 'var(--ok-bg)', fg: 'var(--ok)' }} value={stats?.publicQueries ?? '—'} label="Public checks served" />
        <StatCard icon={Scale} tone={{ bg: 'var(--warn-bg)', fg: 'var(--warn)' }} value={stats?.openDisputes ?? '—'} label="Open disputes" />
      </div>

      <div className="row gap-24 wrap" style={{ alignItems: 'flex-start' }}>
        {/* Recent records */}
        <div className="card grow" style={{ flex: '1 1 520px', minWidth: 0 }}>
          <div className="card-hd spread">
            <strong>Recent registry records</strong>
            <Link to="/registry" className="small">View all <ArrowRight size={13} style={{ verticalAlign: -1 }} /></Link>
          </div>
          <div className="scroll-x">
            <table className="table table-clickable">
              <thead>
                <tr><th>Record</th><th>Category</th><th>Status</th><th>Flagged</th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} onClick={() => (window.location.href = `/registry/${r.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div className="mono tiny faint">{r.id} · {r.caseReference}</div>
                    </td>
                    <td className="small">{categoryLabel(r.category)}</td>
                    <td><RecordStatusBadge status={r.status} legalStatus={r.legalStatus} /></td>
                    <td className="small muted nowrap">{fmtDate(r.flaggedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category breakdown + activity */}
        <div className="stack gap-24" style={{ flex: '1 1 300px', minWidth: 280 }}>
          <div className="card card-pad">
            <div className="section-label" style={{ marginBottom: 16 }}>Records by category</div>
            <div className="stack gap-12">
              {cats.map(([c, n]) => (
                <div key={c}>
                  <div className="spread small" style={{ marginBottom: 5 }}>
                    <span>{categoryLabel(c)}</span>
                    <span className="muted mono">{n}</span>
                  </div>
                  <div className="meter"><span style={{ width: `${(n / maxCat) * 100}%`, background: 'var(--navy-500)' }} /></div>
                </div>
              ))}
              {!cats.length && <div className="small muted">No records yet.</div>}
            </div>
          </div>

          <div className="card">
            <div className="card-hd spread">
              <strong className="small">Recent activity</strong>
              <Link to="/audit" className="small">Ledger <ArrowUpRight size={13} style={{ verticalAlign: -2 }} /></Link>
            </div>
            <div className="card-bd stack gap-14">
              {audit.map((e) => (
                <div key={e.seq} className="row gap-10" style={{ alignItems: 'flex-start' }}>
                  <ActivityIcon action={e.action} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{ACTION_LABEL[e.action] || e.action}</div>
                    <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</div>
                  </div>
                  <span className="tiny faint nowrap">{relTime(e.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ action }) {
  const map = {
    FLAG_CREATED: { Icon: FlagTriangleRight, c: 'var(--danger)' },
    RECORD_SIGNED: { Icon: FileSignature, c: 'var(--navy)' },
    PUBLIC_QUERY: { Icon: Search, c: 'var(--muted)' },
    MATCH_RETURNED: { Icon: ShieldAlert, c: 'var(--warn)' },
    DISPUTE_FILED: { Icon: Scale, c: 'var(--warn)' },
    RECORD_REVOKED: { Icon: Database, c: 'var(--muted)' },
  };
  const { Icon, c } = map[action] || map.PUBLIC_QUERY;
  return (
    <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flex: 'none', color: c }}>
      <Icon size={14} />
    </span>
  );
}
