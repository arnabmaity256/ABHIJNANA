import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Clock, Eye, Check, X, Link2, FileVideo, FlagTriangleRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Badge, EmptyState } from '../../components/ui.jsx';
import { categoryLabel, relTime, fmtDate } from '../../lib/format.js';

const STATUS = {
  new: { label: 'New', cls: 'badge-info', icon: Clock },
  reviewing: { label: 'Reviewing', cls: 'badge-warn', icon: Eye },
  actioned: { label: 'Actioned', cls: 'badge-ok', icon: Check },
  dismissed: { label: 'Dismissed', cls: 'badge-neutral', icon: X },
};

export function Reports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.reports().then(setReports).catch(() => {});
  }, []);

  const sorted = [...reports].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const shown = filter ? sorted.filter((r) => r.status === filter) : sorted;
  const newCount = reports.filter((r) => r.status === 'new').length;

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-head">
        <div className="eyebrow">Layer 5 · Public intake</div>
        <h1 className="page-title">Public reports</h1>
        <p className="page-sub">
          Videos flagged by members of the public for review. A report is intake only — it is never a
          determination. Triage each one, then flag it as a record if confirmed.
        </p>
      </div>

      <div className="spread wrap gap-12" style={{ marginBottom: 16 }}>
        <span className="small muted">
          {shown.length} of {reports.length} reports{newCount ? ` · ${newCount} awaiting triage` : ''}
        </span>
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="card"><EmptyState icon={Flag} title="No reports">Videos reported by the public will appear here for triage.</EmptyState></div>
      ) : (
        <div className="stack gap-14">
          {shown.map((r) => {
            const s = STATUS[r.status] || STATUS.new;
            return (
              <div className="card card-pad" key={r.id}>
                <div className="spread wrap gap-12" style={{ marginBottom: 12 }}>
                  <div className="row gap-10">
                    <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--navy)' }}>
                      <Flag size={17} />
                    </span>
                    <div>
                      <div className="row gap-8">
                        <strong>{r.id}</strong>
                        <Badge cls={s.cls} dot>{s.label}</Badge>
                        <Badge cls="badge-neutral">{categoryLabel(r.category)}</Badge>
                      </div>
                      <div className="tiny muted">Reported by {r.reportedBy} · {relTime(r.submittedAt)} · {fmtDate(r.submittedAt, true)}</div>
                    </div>
                  </div>
                  <div className="row gap-8">
                    {r.kind === 'url' && r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-subtle btn-sm"><Link2 size={14} /> Open link</a>
                    )}
                    <Link to="/flag" className="btn btn-ghost btn-sm"><FlagTriangleRight size={14} /> Flag as record</Link>
                  </div>
                </div>

                <div className="callout info" style={{ marginBottom: 12 }}>
                  <div className="tiny" style={{ fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>REPORTED MEDIA</div>
                  <span className="row gap-6" style={{ minWidth: 0 }}>
                    {r.kind === 'url' ? <Link2 size={13} /> : <FileVideo size={13} />}
                    <span className="mono small" style={{ overflowWrap: 'anywhere' }}>{r.mediaLabel}</span>
                  </span>
                </div>

                <div className="section-label" style={{ marginBottom: 4 }}>What the reporter said</div>
                <p className="small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{r.description}</p>
                {r.contact && <div className="tiny muted" style={{ marginTop: 10 }}>Contact: {r.contact}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
