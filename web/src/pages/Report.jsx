import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, Link2, Send, ShieldCheck, CheckCircle2, RotateCcw, Search,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast, Field } from '../components/ui.jsx';
import { CATEGORY_LABELS } from '../lib/format.js';

const CATEGORIES = Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label }));

export function Report() {
  const toast = useToast();
  const [mode, setMode] = useState('url'); // url | file
  const [form, setForm] = useState({
    url: '', mediaLabel: '', category: '', description: '', reportedBy: '', contact: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (mode === 'url' && !form.url.trim()) return toast('Paste a link to the video', 'err');
    if (mode === 'file' && !form.mediaLabel.trim()) return toast('Choose a video file first', 'err');
    if (!form.description.trim()) return toast('Tell us why you think it may be fake', 'err');
    setSubmitting(true);
    try {
      const rep = await api.fileReport({ ...form, kind: mode });
      setDone(rep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast(e.message || 'Could not submit your report', 'err');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm({ url: '', mediaLabel: '', category: '', description: '', reportedBy: '', contact: '' });
    setMode('url');
    setDone(null);
  }

  if (done) {
    return (
      <div className="container fade-up" style={{ paddingTop: 44, paddingBottom: 40, maxWidth: 720 }}>
        <div className="verdict verdict-clear" style={{ padding: '24px 26px' }}>
          <div className="verdict-icon"><CheckCircle2 /></div>
          <div className="grow">
            <div className="verdict-title">Thank you — your report has been received</div>
            <p style={{ marginTop: 8, color: 'var(--text-2)', maxWidth: '60ch' }}>
              A reviewer will assess the video you reported. A report is not a verdict — nothing is declared
              fake until a person at the authority has examined it. If you left a contact, you may be updated
              on the outcome.
            </p>
            <div className="row gap-12 wrap" style={{ marginTop: 14 }}>
              <span className="mono small muted">Reference: {done.id}</span>
            </div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 22 }}>
          <p className="small muted" style={{ marginBottom: 16 }}>
            Want to know if this video has <em>already</em> been declared fake? You can check it against the
            public registry — you'll get an instant answer with the official record if there's a match.
          </p>
          <div className="row gap-12 wrap">
            <Link to="/check" className="btn btn-primary"><Search size={16} /> Check against the registry</Link>
            <button className="btn btn-ghost" onClick={reset}><RotateCcw size={15} /> Report another video</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 44, paddingBottom: 40, maxWidth: 720 }}>
      <div className="page-head center">
        <div className="eyebrow">Public reporting</div>
        <h1 className="page-title" style={{ fontSize: 32, marginTop: 8 }}>Report a video you think is fake</h1>
        <p className="page-sub center" style={{ margin: '10px auto 0' }}>
          Seen a suspicious deepfake — a scam, a fabricated statement, a manipulated clip? Send it to the
          authority for review. You don't need an account, and you can report anonymously.
        </p>
      </div>

      <div className="card card-pad">
        <div className="center" style={{ marginBottom: 20 }}>
          <div className="seg-toggle">
            <button className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>
              <Link2 size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Paste a link
            </button>
            <button className={mode === 'file' ? 'active' : ''} onClick={() => setMode('file')}>
              <UploadCloud size={15} style={{ marginRight: 6, verticalAlign: -2 }} /> Describe a file
            </button>
          </div>
        </div>

        <div className="stack gap-16">
          {mode === 'url' ? (
            <Field label="Link to the video" hint="A social post, message link, or video URL — wherever you saw it.">
              <input
                className="input"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
              />
            </Field>
          ) : (
            <Field label="Video file name" hint="Uploads aren't accepted in this prototype — name the file (e.g. a forward you received) so reviewers can follow up.">
              <input
                className="input"
                placeholder="e.g. whatsapp_forward.mp4"
                value={form.mediaLabel}
                onChange={(e) => set('mediaLabel', e.target.value)}
              />
            </Field>
          )}

          <Field label="What kind of video is it?">
            <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
              <option value="">I'm not sure / other</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Why do you think it's fake?" hint="Tell us what looks off, where you saw it, and who it targets. This goes to a human reviewer.">
            <textarea
              className="textarea"
              rows={4}
              placeholder="Describe the video and what made you suspicious…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          <div className="row gap-12 wrap">
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Your name (optional)">
                <input className="input" placeholder="Leave blank to stay anonymous" value={form.reportedBy} onChange={(e) => set('reportedBy', e.target.value)} />
              </Field>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Contact (optional)" hint="Only used to update you on the outcome.">
                <input className="input" placeholder="email or phone" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
              </Field>
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={submitting}>
            <Send size={17} /> {submitting ? 'Submitting…' : 'Submit report'}
          </button>
          <p className="tiny muted center" style={{ marginTop: 4 }}>
            <ShieldCheck size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            Reporting a video does not, by itself, mark it as fake — every report is reviewed by a person.
          </p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: 22, background: 'var(--surface-2)' }}>
        <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
          <span className="stat-icon" style={{ margin: 0, width: 40, height: 40, background: 'var(--info-bg)', color: 'var(--navy)' }}>
            <Search />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Just want to check a video?</div>
            <p className="small muted" style={{ marginTop: 4 }}>
              If you only want to know whether a clip is <em>already</em> a known fake, you'll get an instant
              answer from the <Link to="/check">registry check</Link> — no report needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
