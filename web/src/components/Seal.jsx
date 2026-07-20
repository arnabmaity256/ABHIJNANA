// The ABHIJÑĀNA mark — a Devanagari monogram, not a coin or a Western reticle.
//
// The letter अ (first of अभिज्ञान) rendered boldly, anchored on a single cyan
// "recognition line" — an echo of the shirorekha, the headline stroke unique to
// Devanagari. Rooted in the script itself; the name means a token of recognition.
//
// NOTE: interim mark. Final direction (अ monogram vs. lotus/mudra seal vs.
// abstract shirorekha glyph) is still open.
export function Seal({ size = 38, tone = 'default' }) {
  const light = tone === 'light';
  const glyph = light ? '#ffffff' : '#1c1d20';
  const line = light ? '#c47536' : '#a8542b';

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <text
        x="24"
        y="26"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={glyph}
        style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', sans-serif", fontWeight: 700, fontSize: '34px' }}
      >
        अ
      </text>
      {/* recognition line — a shirorekha echo, the one glowing accent */}
      <rect x="12" y="41" width="24" height="2.6" rx="1.3" fill={line}
        style={{ filter: 'drop-shadow(0 0 3px rgba(168,84,43,0.85))' }} />
      <rect x="22.7" y="37.5" width="2.6" height="4" rx="1" fill={line} opacity="0.9" />
    </svg>
  );
}

export function Wordmark({ tone = 'default', sub = 'Synthetic-Media Registry', size = 38 }) {
  const light = tone === 'light';
  return (
    <div className="wordmark">
      <Seal size={size} tone={tone} />
      <div className="wordmark-text">
        <span className="wordmark-name" style={light ? { color: '#fff' } : undefined}>ABHIJÑĀNA</span>
        <span className="wordmark-sub" style={light ? { color: 'var(--on-dark-faint)' } : undefined}>{sub}</span>
      </div>
    </div>
  );
}
