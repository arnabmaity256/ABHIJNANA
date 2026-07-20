import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, FlagTriangleRight, Download } from 'lucide-react';
import { api } from '../../lib/api.js';
import { RecordStatusBadge, SeverityBadge, EmptyState } from '../../components/ui.jsx';
import { categoryLabel, fmtDate } from '../../lib/format.js';

export function ConsoleRegistry() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.records().then((r) => { setRecords(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const cats = [...new Set(records.map((r) => r.category))];
  const filtered = useMemo(() => records.filter((r) => {
    if (status && r.status !== status) return false;
    if (cat && r.category !== cat) return false;
    if (q) {
      const n = q.toLowerCase();
      return r.title.toLowerCase().includes(n) || r.caseReference.toLowerCase().includes(n) || r.id.toLowerCase().includes(n);
    }
    return true;
  }), [records, q, status, cat]);

  return (
    <div className="fade-in">
      <div className="spread wrap gap-16 page-head">
        <div>
          <div className="eyebrow">Registry</div>
          <h1 className="page-title">Flagged-media records</h1>
          <p className="page-sub">Every signed determination held in the registry.</p>
        </div>
        <div className="row gap-8">
          <button className="btn btn-ghost btn-sm"><Download size={15} /> Export</button>
          <Link to="/flag" className="btn btn-primary btn-sm"><FlagTriangleRight size={15} /> Flag a video</Link>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="row gap-12 wrap">
          <div className="row grow" style={{ position: 'relative', minWidth: 220 }}>
            <Search size={16} style={{ position: 'absolute', left: 13, color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 38 }} placeholder="Search title, case reference, ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No records found">Adjust your filters or flag a new video.</EmptyState>
        ) : (
          <div className="scroll-x">
            <table className="table table-clickable">
              <thead>
                <tr>
                  <th>Record</th><th>Category</th><th>Severity</th><th>Jurisdiction</th><th>Status</th><th>Flagged</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/registry/${r.id}`)}>
                    <td style={{ maxWidth: 340 }}>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div className="mono tiny faint">{r.id} · {r.caseReference}</div>
                    </td>
                    <td className="small nowrap">{categoryLabel(r.category)}</td>
                    <td><SeverityBadge severity={r.severity} /></td>
                    <td className="small nowrap">{r.jurisdiction}</td>
                    <td><RecordStatusBadge status={r.status} legalStatus={r.legalStatus} /></td>
                    <td className="small muted nowrap">{fmtDate(r.flaggedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
