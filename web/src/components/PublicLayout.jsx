import { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { Wordmark, Seal } from './Seal.jsx';
import { getConsoleUrl } from '../lib/domains.js';

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <div className="stack" style={{ minHeight: '100vh' }}>
      <header className="site-header">
        <div className="container">
          <Link to="/" aria-label="ABHIJNANA home">
            <Wordmark />
          </Link>
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
             {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`site-nav ${menuOpen ? 'mobile-open' : ''}`} onClick={() => setMenuOpen(false)}>
            <NavLink to="/check">Check a video</NavLink>
            <NavLink to="/report">Report a video</NavLink>
            <NavLink to="/registry">Public registry</NavLink>
            <NavLink to="/about">How it works</NavLink>
            <a href={`${getConsoleUrl()}/login`} className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }}>
              <ShieldCheck size={15} /> Authority sign-in
            </a>
          </nav>
        </div>
      </header>

      <main className="grow">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="spread wrap gap-24" style={{ alignItems: 'flex-start' }}>
            <div style={{ maxWidth: 360 }}>
              <Wordmark tone="light" />
              <p className="small" style={{ marginTop: 14, color: 'var(--on-dark-muted)' }}>
                An authoritative registry and verification system for flagged synthetic media. Every public
                result points back to a signed determination made by a competent authority.
              </p>
            </div>
            <div className="row gap-32" style={{ alignItems: 'flex-start' }}>
              <div className="stack gap-8">
                <div className="section-label" style={{ color: 'var(--on-dark-faint)' }}>Public</div>
                <Link to="/check">Check a video</Link>
                <Link to="/report">Report a video</Link>
                <Link to="/registry">Public registry</Link>
                <Link to="/about">How it works</Link>
              </div>
              <div className="stack gap-8">
                <div className="section-label" style={{ color: 'var(--on-dark-faint)' }}>Governance</div>
                <Link to="/about#trust">Trust &amp; accountability</Link>
                <a href={`${getConsoleUrl()}/login`}>Authority sign-in</a>
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="hr" style={{ background: 'rgba(255,255,255,0.08)', margin: '28px 0 20px' }} />
          <div className="spread wrap gap-12 tiny" style={{ color: 'var(--on-dark-faint)' }}>
            <span>Copyright © 2026 Arnab Maity · Aligned with the Digital Personal Data Protection Act, 2023.</span>
            <span className="row gap-6"><Seal size={16} tone="light" /> अभिज्ञान — “Recognition of the Known”</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
