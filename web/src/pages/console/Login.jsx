import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Fingerprint, KeyRound, ArrowRight, AtSign } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Wordmark, Seal } from '../../components/Seal.jsx';
import { Field, useToast } from '../../components/ui.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { getPublicUrl } from '../../lib/domains.js';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  async function signIn() {
    if (!form.username.trim() || !form.password) return toast('Enter your username and password', 'err');
    setBusy(true);
    try {
      const session = await api.authLogin({ username: form.username.trim(), password: form.password });
      login(session);
      navigate('/');
    } catch (e) {
      setBusy(false);
      toast(e.message || 'Sign-in failed', 'err');
    }
  }



  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', minHeight: '100vh' }}>
      {/* Brand panel */}
      <div className="hero" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 48px' }}>
        <a href={getPublicUrl()} style={{ position: 'relative' }}><Wordmark tone="light" sub="Authority Console" /></a>
        <div style={{ position: 'relative' }}>
          <div className="row gap-8" style={{ marginBottom: 20, color: 'var(--gold-bright)', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <Lock size={13} /> Restricted — verified authorities only
          </div>
          <h1 style={{ color: '#fff', fontSize: 34, lineHeight: 1.15, maxWidth: '16ch' }}>
            The authority side of the registry.
          </h1>
          <p style={{ color: 'var(--on-dark-muted)', marginTop: 18, maxWidth: '46ch', lineHeight: 1.6 }}>
            Investigate, formally mark synthetic media as fake, and commit signed records to the
            tamper-evident registry. Every action is attributed and logged.
          </p>
          <div className="stack gap-12" style={{ marginTop: 30 }}>
            {[
              { icon: Fingerprint, t: 'Strong identity verification & role-based access' },
              { icon: KeyRound, t: 'Accounts are provisioned by an administrator' },
              { icon: ShieldCheck, t: 'Full audit logging & chain of custody' },
            ].map((x) => (
              <div key={x.t} className="row gap-10" style={{ color: 'var(--on-dark)', fontSize: 14 }}>
                <x.icon size={17} style={{ color: 'var(--gold-bright)' }} /> {x.t}
              </div>
            ))}
          </div>
        </div>
        <div className="tiny" style={{ position: 'relative', color: 'var(--on-dark-faint)' }}>
          Copyright © 2026 Arnab Maity · Access constitutes acceptance of the <Link to="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms of Service</Link>.
        </div>
      </div>

      {/* Sign-in card */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 32, background: 'var(--paper)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="center" style={{ marginBottom: 24 }}>
            <div style={{ display: 'inline-flex', marginBottom: 14 }}><Seal size={46} /></div>
            <h2 style={{ fontSize: 23 }}>Sign in to the console</h2>
            <p className="small muted" style={{ marginTop: 6 }}>Enter your authority credentials to continue.</p>
          </div>

          <div className="stack gap-16">
            <Field label="Username">
              <div className="input-icon">
                <AtSign size={15} />
                <input
                  className="input"
                  placeholder="e.g. r.deshpande"
                  value={form.username}
                  autoComplete="username"
                  onChange={(e) => set('username', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && signIn()}
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="input-icon">
                <Lock size={15} />
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  autoComplete="current-password"
                  onChange={(e) => set('password', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && signIn()}
                />
              </div>
            </Field>

            <button className="btn btn-primary btn-lg btn-block" onClick={signIn} disabled={busy}>
              {busy ? <><span className="spinner" /> Authenticating…</> : <>Sign in securely <ArrowRight size={17} /></>}
            </button>
          </div>

          <p className="tiny muted center" style={{ marginTop: 24 }}>
            Restricted access. Authorized operators only. <a href={getPublicUrl()}>Return to public portal</a>
          </p>
        </div>
      </div>
    </div>
  );
}
