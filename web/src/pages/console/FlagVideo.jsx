import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileVideo, Check, Sparkles, FileSignature, Fingerprint, Layers,
  ScanSearch, ShieldCheck, ArrowRight, ArrowLeft, Building2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/auth.jsx';
import { useToast, Field } from '../../components/ui.jsx';
import { categoryLabel, fmtDuration } from '../../lib/format.js';

const STEPS = ['Evidence', 'Determination', 'Sign & commit'];

const REASON_TEMPLATES = {
  political: 'Synthetic video falsely depicting {subject} making a statement that was never made. Facial re-enactment and voice synthesis confirmed by forensic examination; no corresponding statement exists on the official record.',
  'financial-scam': 'Face- and voice-cloned endorsement used to promote a fraudulent scheme. Confirmed synthetic; circulated to defraud members of the public.',
  impersonation: 'Fabricated clip impersonating {subject}. Synthetic generation confirmed; content misattributes statements to the impersonated individual.',
  communal: 'Genuine footage re-dubbed with fabricated inflammatory remarks. Audio synthesis confirmed; original event unrelated to the claimed statements.',
  'market-manipulation': 'Synthetic video fabricating a corporate announcement, timed to influence a listed security. Deepfake confirmed.',
  ncii: 'Non-consensual synthetic imagery. Confirmed fabricated; handled under restricted evidentiary controls.',
  other: 'Synthetic media confirmed fabricated following forensic examination.',
};

const PIPE = [
  { icon: FileVideo, label: 'Decoding & normalising' },
  { icon: Layers, label: 'Windowing into overlapping segments' },
  { icon: Fingerprint, label: 'Extracting perceptual + audio fingerprints' },
  { icon: ScanSearch, label: 'Writing to the similarity index' },
  { icon: FileSignature, label: 'Signing record with authority key' },
];

export function FlagVideo() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [cats, setCats] = useState([]);
  const [file, setFile] = useState(null);
  const [durationDetected, setDurationDetected] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [pipeStep, setPipeStep] = useState(-1);

  const [form, setForm] = useState({
    sourceLabel: '',
    durationSec: 30,
    title: '',
    category: 'political',
    jurisdiction: 'All Zones',
    legalStatus: 'Confirmed Fake',
    severity: 'high',
    caseReference: '',
    reason: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.meta().then((m) => setCats(m.categories)).catch(() => {});
  }, []);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    set('sourceLabel', f.name);
    // Read the media's real duration so the officer never hand-types it — it
    // drives how many fingerprint windows the record is indexed into.
    setDurationDetected(false);
    const url = URL.createObjectURL(f);
    const el = document.createElement(f.type.startsWith('audio') ? 'audio' : 'video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (Number.isFinite(el.duration) && el.duration > 0) {
        set('durationSec', Math.round(el.duration * 10) / 10);
        setDurationDetected(true);
      }
    };
    el.onerror = () => URL.revokeObjectURL(url);
    el.src = url;
  }

  function assist() {
    const tmpl = REASON_TEMPLATES[form.category] || REASON_TEMPLATES.other;
    set('reason', tmpl.replace('{subject}', 'the depicted individual'));
    toast('Draft inserted by assistance layer — review before signing');
  }

  function next() {
    if (step === 0 && !form.sourceLabel) return toast('Add the source video first', 'err');
    if (step === 1) {
      if (!form.title.trim()) return toast('A record title is required', 'err');
      if (!form.reason.trim()) return toast('A determination reason is required', 'err');
      if (!form.caseReference.trim()) return toast('A case reference is required', 'err');
    }
    setStep((s) => Math.min(s + 1, 2));
  }

  async function commit() {
    if (!file) return toast('Please select an evidence video file first', 'err');
    setCommitting(true);
    setPipeStep(0);
    for (let i = 0; i < PIPE.length; i++) {
      await new Promise((r) => setTimeout(r, 480));
      setPipeStep(i + 1);
    }
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', form.title);
      formData.append('category', form.category);
      formData.append('jurisdiction', form.jurisdiction);
      formData.append('legalStatus', form.legalStatus);
      formData.append('severity', form.severity);
      formData.append('caseReference', form.caseReference);
      formData.append('reason', form.reason);
      formData.append('durationSec', Number(form.durationSec));
      formData.append('sourceLabel', form.sourceLabel);

      const rec = await api.createRecord(formData);
      toast(`Record ${rec.id} signed & committed`);
      navigate(`/registry/${rec.id}`);
    } catch (e) {
      toast(e.message || 'Commit failed', 'err');
      setCommitting(false);
      setPipeStep(-1);
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="page-head">
        <div className="eyebrow">Authority action</div>
        <h1 className="page-title">Flag a video as fake</h1>
        <p className="page-sub">Create a signed, immutable registry record. This determination will be publicly matchable and attributed to your agency.</p>
      </div>

      {/* Stepper */}
      <div className="stepper" style={{ marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'contents' }}>
            <div className={`step ${step === i ? 'active' : step > i ? 'done' : ''}`}>
              <span className="num">{step > i ? <Check size={14} /> : i + 1}</span>
              <span className="lab">{s}</span>
            </div>
            {i < STEPS.length - 1 && <span className={`bar ${step > i ? 'done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Step 0 — evidence */}
      {step === 0 && (
        <div className="card card-pad stack gap-20 fade-in">
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}
          >
            <input ref={fileRef} type="file" accept="video/*,audio/*" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
            <div className="dropzone-icon"><UploadCloud /></div>
            {file ? (
              <>
                <div style={{ fontWeight: 600 }}>{file.name}</div>
                <div className="small muted" style={{ marginTop: 4 }}>{(file.size / 1e6).toFixed(1)} MB · click to replace</div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 600 }}>Upload the confirmed fake</div>
                <div className="small muted" style={{ marginTop: 4 }}>This media becomes the fingerprint source. Stored under restricted evidentiary controls.</div>
              </>
            )}
          </div>
          <div className="row gap-16 wrap">
            <div style={{ flex: '1 1 260px' }}>
              <Field label="Source label / original filename">
                <input className="input" value={form.sourceLabel} onChange={(e) => set('sourceLabel', e.target.value)} placeholder="e.g. fwd_minister_currency.mp4" />
              </Field>
            </div>
            <div style={{ flex: '0 1 200px' }}>
              {durationDetected ? (
                <Field label="Media duration" hint="Read from the uploaded file · sets the fingerprint window count">
                  <div className="input mono" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                    <Check size={14} style={{ color: 'var(--ok)' }} /> {fmtDuration(form.durationSec)} ({form.durationSec}s)
                  </div>
                </Field>
              ) : (
                <Field label="Media duration (seconds)" hint="Auto-read on upload; enter it only if the file can't be read">
                  <input className="input" type="number" min="1" step="0.1" value={form.durationSec} onChange={(e) => set('durationSec', e.target.value)} />
                </Field>
              )}
            </div>
          </div>
          <div className="callout info">
            The same fingerprinting pipeline used here also runs on every public submission — that shared pipeline is what lets a citizen's query match this record.
          </div>
        </div>
      )}

      {/* Step 1 — determination */}
      {step === 1 && (
        <div className="card card-pad stack gap-18 fade-in">
          <Field label="Record title" hint="A clear, public-facing description of the fabricated content">
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Fabricated ministerial statement on currency withdrawal" />
          </Field>
          <div className="row gap-16 wrap">
            <div style={{ flex: '1 1 220px' }}>
              <Field label="Category">
                <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <Field label="Jurisdiction">
                <input className="input" value={form.jurisdiction} onChange={(e) => set('jurisdiction', e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="row gap-16 wrap">
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Legal status">
                <select className="select" value={form.legalStatus} onChange={(e) => set('legalStatus', e.target.value)}>
                  <option>Confirmed Fake</option>
                  <option>Under Review</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Field label="Severity">
                <select className="select" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </Field>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <Field label="Case reference">
                <input className="input mono" value={form.caseReference} onChange={(e) => set('caseReference', e.target.value)} placeholder="SMVA/2026/…" />
              </Field>
            </div>
          </div>
          <div>
            <div className="spread" style={{ marginBottom: 7 }}>
              <span className="field-label">Reason for determination</span>
              <button className="btn btn-subtle btn-sm" onClick={assist} type="button" style={{ color: 'var(--gold)' }}>
                <Sparkles size={14} /> Draft with assistance
              </button>
            </div>
            <textarea className="textarea" rows={4} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Basis for the determination, forensic findings, and context." />
            <div className="field-hint" style={{ marginTop: 6 }}>The assistance layer (Layer 7) may draft this text — it never decides the verdict. Review before signing.</div>
          </div>
        </div>
      )}

      {/* Step 2 — sign & commit */}
      {step === 2 && (
        <div className="card fade-in">
          <div className="card-hd"><strong>Review &amp; sign</strong></div>
          <div className="card-bd">
            {!committing ? (
              <>
                <div className="dl">
                  <dt>Title</dt><dd style={{ fontWeight: 600 }}>{form.title}</dd>
                  <dt>Category</dt><dd>{categoryLabel(form.category)}</dd>
                  <dt>Legal status</dt><dd>{form.legalStatus}</dd>
                  <dt>Jurisdiction</dt><dd>{form.jurisdiction}</dd>
                  <dt>Case reference</dt><dd className="mono">{form.caseReference}</dd>
                  <dt>Source</dt><dd className="mono">{form.sourceLabel} · {fmtDuration(form.durationSec)}</dd>
                  <dt>Issuing authority</dt><dd className="row gap-6"><Building2 size={14} className="muted" /> {user.agencyName}</dd>
                  <dt>Flagging officer</dt><dd>{user.name}</dd>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div className="section-label" style={{ marginBottom: 6 }}>Reason</div>
                  <p className="small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{form.reason}</p>
                </div>
                <div className="callout" style={{ marginTop: 18 }}>
                  On signing, this record is fingerprinted, written to the similarity index, cryptographically
                  signed with your agency key, and committed to the append-only audit ledger. This action is irreversible except by formal revocation.
                </div>
              </>
            ) : (
              <div className="proc-steps">
                {PIPE.map((p, i) => (
                  <div key={i} className={`proc-step ${i < pipeStep ? 'done' : i === pipeStep ? 'active' : ''}`}>
                    <span className="proc-check">{i < pipeStep ? <Check /> : <p.icon size={13} />}</span>
                    {p.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      {!committing && (
        <div className="spread" style={{ marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={16} /> Back
          </button>
          {step < 2 ? (
            <button className="btn btn-primary" onClick={next}>Continue <ArrowRight size={16} /></button>
          ) : (
            <button className="btn btn-gold btn-lg" onClick={commit}><ShieldCheck size={17} /> Sign &amp; commit record</button>
          )}
        </div>
      )}
    </div>
  );
}
