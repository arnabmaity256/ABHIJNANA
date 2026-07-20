import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, FlagTriangleRight, Database, ScrollText, Scale,
  LogOut, Menu, ExternalLink, Flag, Users,
} from 'lucide-react';
import { Wordmark } from './Seal.jsx';
import { useAuth } from '../lib/auth.jsx';
import { getPublicUrl } from '../lib/domains.js';

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

  if (!user) return <Navigate to="/login" replace />;

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
              onClick={() => { logout(); window.location.href = getPublicUrl(); }}
              aria-label="Sign out"
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
    </div>
  );
}
