export const CATEGORY_LABELS = {
  political: 'Political / Electoral',
  'financial-scam': 'Financial Scam',
  impersonation: 'Impersonation',
  communal: 'Communal Incitement',
  'market-manipulation': 'Market Manipulation',
  ncii: 'Non-Consensual Imagery',
  other: 'Other',
};

export function categoryLabel(c) {
  return CATEGORY_LABELS[c] || c;
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  if (!withTime) return date;
  return `${date}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

export function relTime(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function fmtDuration(sec) {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const SEVERITY = {
  critical: { label: 'Critical', cls: 'badge-danger' },
  high: { label: 'High', cls: 'badge-warn' },
  medium: { label: 'Medium', cls: 'badge-info' },
  low: { label: 'Low', cls: 'badge-neutral' },
};

export const VERDICT = {
  match: {
    key: 'match',
    title: 'Officially flagged as fake',
    label: 'Match',
    cls: 'badge-danger',
    banner: 'verdict-match',
  },
  possible: {
    key: 'possible',
    title: 'Possible match — routed for human review',
    label: 'Possible match',
    cls: 'badge-warn',
    banner: 'verdict-possible',
  },
  clear: {
    key: 'clear',
    title: 'No match in the registry',
    label: 'No match',
    cls: 'badge-ok',
    banner: 'verdict-clear',
  },
};
