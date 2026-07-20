import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, UserPlus, ShieldCheck, Building2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast, Modal, Field, Badge, EmptyState } from '../../components/ui.jsx';

const ROLES = ['Flagging Officer', 'Verification Analyst', 'System Administrator'];
const CLEARANCES = ['L1', 'L2', 'L3', 'L4'];

const EMPTY = { name: '', username: '', role: ROLES[0], clearance: 'L2', password: '', agencyId: '' };

export function Team() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function load() {
    api.users().then(setUsers).catch(() => {});
  }
  useEffect(() => {
    load();
    api.meta().then((m) => {
      setAgencies(m.agencies);
      setForm((f) => ({ ...f, agencyId: m.agencies[0]?.id || '' }));
    }).catch(() => {});
  }, []);

  // Admin-only surface.
  if (user && user.role !== 'System Administrator') return <Navigate to="/" replace />;

  async function submit() {
    if (!form.name.trim()) return toast('Enter the officer’s name', 'err');
    if (form.password.length < 8) return toast('Password must be at least 8 characters', 'err');
    setBusy(true);
    try {
      const created = await api.createUser(form);
      toast(`Account ${created.username} provisioned`);
      setOpen(false);
      setForm({ ...EMPTY, agencyId: agencies[0]?.id || '' });
      load();
    } catch (e) {
      toast(e.message || 'Could not create the account', 'err');
    } finally {
      setBusy(false);
    }
  }

  const roleCls = (r) => (r === 'System Administrator' ? 'badge-danger' : r === 'Flagging Officer' ? 'badge-info' : 'badge-neutral');

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="spread wrap gap-16 page-head">
        <div>
          <div className="eyebrow">Administration · Access control</div>
          <h1 className="page-title">Team &amp; accounts</h1>
          <p className="page-sub">Provision operator accounts for the authority. Only administrators can add accounts, and every new account is written to the audit ledger.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} /> Create account</button>
      </div>

      {users.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No accounts">Provisioned operator accounts will appear here.</EmptyState></div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Clearance</th><th>Authority</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    {u.name}
                    {u.id === user?.id && <span className="tiny muted" style={{ marginLeft: 6 }}>· you</span>}
                  </td>
                  <td className="mono small muted">{u.username}</td>
                  <td><Badge cls={roleCls(u.role)}>{u.role}</Badge></td>
                  <td className="mono small">{u.clearance}</td>
                  <td className="small muted"><span className="row gap-6"><Building2 size={13} /> {u.agencyShort}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create an authority account"
        footer={
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
              {busy ? 'Creating…' : <><UserPlus size={14} /> Create account</>}
            </button>
          </div>
        }
      >
        <div className="stack gap-16">
          <div className="row gap-12 wrap">
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Full name"><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Insp. P. Menon" /></Field>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Username" hint="Auto-generated from the name if left blank."><input className="input" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="p.menon" /></Field>
            </div>
          </div>
          <div className="row gap-12 wrap">
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Role">
                <select className="select" value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <Field label="Clearance">
                <select className="select" value={form.clearance} onChange={(e) => set('clearance', e.target.value)}>
                  {CLEARANCES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <Field label="Authority">
                <select className="select" value={form.agencyId} onChange={(e) => set('agencyId', e.target.value)}>
                  {agencies.map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <Field label="Temporary password" hint="At least 8 characters. Share it securely with the new operator.">
            <input className="input" type="text" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Set an initial password" />
          </Field>
          <div className="callout info tiny row gap-6" style={{ alignItems: 'flex-start' }}>
            <ShieldCheck size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>The password is stored only as a salted hash. This provisioning action is attributed to you and committed to the audit ledger.</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
