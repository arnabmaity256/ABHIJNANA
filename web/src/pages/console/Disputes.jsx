import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Plus, Clock, Check, X, FileText } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useToast, Modal, Field, Badge, EmptyState } from '../../components/ui.jsx';
import { fmtDate, relTime } from '../../lib/format.js';

const STATUS = {
  open: { label: 'Open', cls: 'badge-info', icon: Clock },
  'under-review': { label: 'Under review', cls: 'badge-warn', icon: Clock },
  upheld: { label: 'Upheld', cls: 'badge-ok', icon: Check },
  rejected: { label: 'Rejected', cls: 'badge-neutral', icon: X },
};

export function Disputes() {
  const toast = useToast();
  const [disputes, setDisputes] = useState([]);
  const [records, setRecords] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recordId: '', filedBy: '', contact: '', grounds: '' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function load() {
    api.disputes().then(setDisputes).catch(() => {});
    api.records().then(setRecords).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  const recTitle = (id) => records.find((r) => r.id === id)?.title || id;

  async function submit() {
    if (!form.recordId) return toast('Select the disputed record', 'err');
    if (!form.grounds.trim()) return toast('State the grounds for appeal', 'err');
    try {
      await api.fileDispute(form);
      toast('Appeal filed & logged');
      setOpen(false);
      setForm({ recordId: '', filedBy: '', contact: '', grounds: '' });
      load();
    } catch (e) {
      toast(e.message || 'Filing failed', 'err');
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="spread wrap gap-16 page-head">
        <div>
          <div className="eyebrow">Layer 4 · Accountability</div>
          <h1 className="page-title">Disputes &amp; appeals</h1>
          <p className="page-sub">A formal channel to contest a “fake” designation — indispensable for correcting errors and protecting legitimate expression.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> File an appeal</button>
      </div>

      {disputes.length === 0 ? (
        <div className="card"><EmptyState icon={Scale} title="No appeals on record">Contested determinations will appear here for human review.</EmptyState></div>
      ) : (
        <div className="stack gap-14">
          {disputes.map((d) => {
            const s = STATUS[d.status] || STATUS.open;
            return (
              <div className="card card-pad" key={d.id}>
                <div className="spread wrap gap-12" style={{ marginBottom: 12 }}>
                  <div className="row gap-10">
                    <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--navy)' }}>
                      <Scale size={17} />
                    </span>
                    <div>
                      <div className="row gap-8">
                        <strong>{d.id}</strong>
                        <Badge cls={s.cls} dot>{s.label}</Badge>
                      </div>
                      <div className="tiny muted">Filed by {d.filedBy} · {relTime(d.filedAt)}</div>
                    </div>
                  </div>
                  <Link to={`/registry/${d.recordId}`} className="btn btn-ghost btn-sm"><FileText size={14} /> View record</Link>
                </div>
                <div className="callout info" style={{ marginBottom: 12 }}>
                  <div className="tiny" style={{ fontWeight: 700, marginBottom: 4, letterSpacing: '0.04em' }}>DISPUTED RECORD</div>
                  <Link to={`/registry/${d.recordId}`}>{recTitle(d.recordId)}</Link> <span className="mono faint tiny">({d.recordId})</span>
                </div>
                <div className="section-label" style={{ marginBottom: 4 }}>Grounds</div>
                <p className="small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{d.grounds}</p>
                {d.contact && <div className="tiny muted" style={{ marginTop: 10 }}>Contact: {d.contact}</div>}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="File an appeal"
        footer={
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={submit}><Scale size={14} /> Submit appeal</button>
          </div>
        }
      >
        <div className="stack gap-16">
          <Field label="Disputed record">
            <select className="select" value={form.recordId} onChange={(e) => set('recordId', e.target.value)}>
              <option value="">Select a record…</option>
              {records.filter((r) => r.status === 'active').map((r) => (
                <option key={r.id} value={r.id}>{r.id} — {r.title}</option>
              ))}
            </select>
          </Field>
          <div className="row gap-12 wrap">
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Filed by"><input className="input" value={form.filedBy} onChange={(e) => set('filedBy', e.target.value)} placeholder="Name / capacity" /></Field>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Contact"><input className="input" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="email@…" /></Field>
            </div>
          </div>
          <Field label="Grounds for appeal" hint="This is structured for human review — no model decides the outcome.">
            <textarea className="textarea" rows={4} value={form.grounds} onChange={(e) => set('grounds', e.target.value)} placeholder="Explain why the determination should be reconsidered." />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
