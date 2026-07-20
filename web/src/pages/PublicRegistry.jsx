import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api.js';
import { RecordArt, RecordStatusBadge, EmptyState } from '../components/ui.jsx';
import { categoryLabel, fmtDate, CATEGORY_LABELS } from '../lib/format.js';

export function PublicRegistry() {
  const [records, setRecords] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.records({ status: 'active' }).then((r) => { setRecords(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (cat && r.category !== cat) return false;
      if (q) {
        const n = q.toLowerCase();
        return r.title.toLowerCase().includes(n) || r.caseReference.toLowerCase().includes(n) || r.id.toLowerCase().includes(n);
      }
      return true;
    });
  }, [records, q, cat]);

  const cats = [...new Set(records.map((r) => r.category))];

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 60 }}>
      <div className="page-head">
        <div className="eyebrow">Transparency</div>
        <h1 className="page-title">Public registry of flagged media</h1>
        <p className="page-sub">
          Records that competent authorities have formally declared to be synthetic. Each entry is
          cryptographically signed and independently verifiable. Sensitive evidentiary media is not published.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="row gap-12 wrap">
          <div className="row grow" style={{ position: 'relative', minWidth: 240 }}>
            <Search size={16} style={{ position: 'absolute', left: 13, color: 'var(--muted)' }} />
            <input className="input" style={{ paddingLeft: 38 }} placeholder="Search by title, case reference or record ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="row gap-8">
            <SlidersHorizontal size={16} className="muted" />
            <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">All categories</option>
              {cats.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="spread" style={{ marginBottom: 16 }}>
        <span className="small muted">{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="empty">Loading registry…</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No records match your filters">Try clearing the search or category.</EmptyState>
      ) : (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {filtered.map((r) => (
            <Link key={r.id} to={`/verify/${r.id}`} className="card" style={{ overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ padding: 12 }}>
                <RecordArt record={r} />
              </div>
              <div style={{ padding: '4px 18px 20px' }}>
                <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
                  <RecordStatusBadge status={r.status} legalStatus={r.legalStatus} />
                  <span className="badge badge-neutral">{categoryLabel(r.category)}</span>
                </div>
                <h4 style={{ fontSize: 16, lineHeight: 1.3 }}>{r.title}</h4>
                <div className="small muted" style={{ marginTop: 10 }}>{r.authorityShort} · {r.jurisdiction}</div>
                <div className="row spread" style={{ marginTop: 12 }}>
                  <span className="mono tiny faint">{r.id}</span>
                  <span className="tiny muted">{fmtDate(r.flaggedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
