import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Film, Lock, Inbox } from 'lucide-react';
import { SEVERITY, VERDICT, categoryLabel, fmtDuration } from '../lib/format.js';

export function Badge({ children, cls = '', dot = false }) {
  return (
    <span className={`badge ${cls}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function CategoryBadge({ category }) {
  return <Badge cls="badge-neutral">{categoryLabel(category)}</Badge>;
}

export function SeverityBadge({ severity }) {
  const s = SEVERITY[severity] || SEVERITY.low;
  return <Badge cls={s.cls} dot>{s.label}</Badge>;
}

export function RecordStatusBadge({ status, legalStatus }) {
  if (status === 'revoked') return <Badge cls="badge-neutral" dot>Revoked</Badge>;
  if (legalStatus === 'Under Review') return <Badge cls="badge-warn" dot>Under Review</Badge>;
  return <Badge cls="badge-danger" dot>Confirmed Fake</Badge>;
}

export function VerdictBadge({ verdict }) {
  const v = VERDICT[verdict] || VERDICT.clear;
  return <Badge cls={v.cls} dot>{v.label}</Badge>;
}

export function Meter({ value, tone = 'var(--navy)' }) {
  return (
    <div className="meter">
      <span style={{ width: `${Math.round(value * 100)}%`, background: tone }} />
    </div>
  );
}

export function RecordArt({ record }) {
  const dur = record?.durationSec;
  const [hasVideo, setHasVideo] = useState(true);

  return (
    <div className="record-art" style={{ position: 'relative', overflow: 'hidden' }}>
      {hasVideo && record?.id ? (
        <video
          src={`/api/records/${record.id}/video`}
          preload="metadata"
          onError={() => setHasVideo(false)}
          playsInline
          muted
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
        />
      ) : null}

      {!hasVideo && (
        <>
          <div className="ra-grid" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
          <div className="ra-center" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2 }}><Film strokeWidth={1.5} /></div>
        </>
      )}

      <span className="ra-tag" style={{ zIndex: 3 }}>
        <Lock size={11} style={{ marginRight: 4, verticalAlign: -1 }} /> 
        {hasVideo ? 'Evidence preview' : 'Restricted media'}
      </span>
      {dur != null && <span className="ra-dur" style={{ zIndex: 3 }}>{fmtDuration(dur)}</span>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="empty">
      <Icon />
      <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>{title}</div>
      {children && <div className="small">{children}</div>}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="card-hd spread">
          <h3 style={{ fontSize: 18 }}>{title}</h3>
          <button className="btn btn-subtle btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="card-bd">{children}</div>
        {footer && <div className="card-hd" style={{ borderTop: '1px solid var(--line)', borderBottom: 'none' }}>{footer}</div>}
      </div>
    </div>
  );
}

/* ---- Toasts -------------------------------------------------------------- */
const ToastCtx = createContext(null);
export function useToast() {
  return useContext(ToastCtx);
}
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast fade-up ${t.type === 'err' ? 'toast-err' : 'toast-ok'}`}>
            {t.type === 'err' ? <AlertCircle /> : <CheckCircle2 />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
