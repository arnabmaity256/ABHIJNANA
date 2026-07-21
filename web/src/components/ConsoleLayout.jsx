import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, FlagTriangleRight, Database, ScrollText, Scale,
  LogOut, Menu, ExternalLink, Flag, Users, KeyRound,
} from 'lucide-react';
import { Wordmark } from './Seal.jsx';
import { useAuth } from '../lib/auth.jsx';
import { getPublicUrl } from '../lib/domains.js';
import { api } from '../lib/api.js';
import { Modal, Field, useToast } from './ui.jsx';

const NAV = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/flag', icon: FlagTriangleRight, label: 'Flag a video' },
  { to: '/registry', icon: Database, label: 'Registry' },
  { to: '/reports', icon: Flag, label: 'Public reports' },
  { to: '/audit', icon: ScrollText, label: 'Audit ledger' },
  { to: '/disputes', icon: Scale, label: 'Disputes & appeals' },
];

const ADMIN_NAV = [
  { to: '/team', icon: Users, label: 'Team & accounts' },
];

export function ConsoleLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const toast = useToast();

  if (!user) return <Navigate to="/login" replace />;

  const handlePwChange = (k, v) => setPwForm((f) => ({ ...f, [k]: v }));

  async function submitPasswordChange() {
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      return toast('All fields are required', 'err');
    }
    if (pwForm.newPassword.length < 8) {
      return toast('New password must be at least 8 characters long', 'err');
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast('Passwords do not match', 'err');
    }
    setPwBusy(true);
    try {
      await api.authChangePassword({
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      toast('Password changed successfully. Please log in again.');
      setPwOpen(false);
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      logout();
    } catch (e) {
      toast(e.message || 'Failed to change password', 'err');
    } finally {
      setPwBusy(false);
    }
  }

  const initials = user.name.split(' ').map((w) => w[0]).slice(-2).join('');

  return (
    <div className="console-shell">
      <div className={`console-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/"><Wordmark tone="light" sub="Authority Console" size={34} /></Link>
        </div>
        <div className="sidebar-scope">
          <div className="tiny" style={{ color: 'var(--on-dark-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 5 }}>
            Operating authority
          </div>
          {user.agencyName}
        </div>
        <nav className="sidebar-nav" onClick={() => setOpen(false)}>
          <div className="navlabel">Operations</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <n.icon /> {n.label}
            </NavLink>
          ))}
          {user.role === 'System Administrator' && (
            <>
              <div className="navlabel">Administration</div>
              {ADMIN_NAV.map((n) => (
                <NavLink key={n.to} to={n.to}>
                  <n.icon /> {n.label}
                </NavLink>
              ))}
            </>
          )}
          <div className="navlabel">Public site</div>
          <a href={getPublicUrl()}><ExternalLink /> Public portal</a>
        </nav>
        <div className="sidebar-user">
          <div className="row gap-12">
            <div className="avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 600 }}>{user.name}</div>
              <div className="tiny" style={{ color: 'var(--on-dark-faint)' }}>{user.role} · {user.clearance}</div>
            </div>
            <button
              className="btn btn-subtle btn-sm"
              style={{ marginLeft: 'auto', color: 'var(--on-dark-muted)' }}
              onClick={() => setPwOpen(true)}
              aria-label="Change password"
              title="Change password"
            >
              <KeyRound size={16} />
            </button>
            <button
              className="btn btn-subtle btn-sm"
              style={{ color: 'var(--on-dark-muted)' }}
              onClick={() => { logout(); window.location.href = getPublicUrl(); }}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="console-main">
        <div className="topbar">
          <button className="btn btn-subtle btn-sm mobile-menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            <Menu size={18} />
          </button>
          <div className="row gap-12" style={{ marginLeft: 'auto' }}>
            <span className="small muted nowrap">{user.agencyShort}</span>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
          </div>
        </div>
        <div className="console-content fade-in">
          <Outlet />
        </div>
      </div>

      <Modal
        open={pwOpen}
        onClose={() => { if (!pwBusy) setPwOpen(false); }}
        title="Change Password"
        footer={
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPwOpen(false)} disabled={pwBusy}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={submitPasswordChange} disabled={pwBusy}>
              {pwBusy ? 'Updating…' : 'Change password'}
            </button>
          </div>
        }
      >
        <div className="stack gap-16">
          <Field label="Current password">
            <input
              className="input"
              type="password"
              value={pwForm.oldPassword}
              onChange={(e) => handlePwChange('oldPassword', e.target.value)}
              placeholder="Enter current password"
              disabled={pwBusy}
            />
          </Field>
          <Field label="New password" hint="Must be at least 8 characters long.">
            <input
              className="input"
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => handlePwChange('newPassword', e.target.value)}
              placeholder="Enter new password"
              disabled={pwBusy}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              className="input"
              type="password"
              value={pwForm.confirmPassword}
              onChange={(e) => handlePwChange('confirmPassword', e.target.value)}
              placeholder="Confirm new password"
              disabled={pwBusy}
              onKeyDown={(e) => e.key === 'Enter' && submitPasswordChange()}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
