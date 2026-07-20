import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import * as store from './store.js';
import { cacheMiddleware, invalidatePrefix } from './cache.js';

// Helper to download a video from a URL to a temporary file
async function downloadVideo(url, targetPath) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(targetPath, buffer);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

store.init();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// File upload middleware
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Engine URL — the Python FastAPI matching engine (default port 4318).
const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:4318';

// Check if the engine is available.
async function engineAvailable() {
  try {
    const res = await fetch(`${ENGINE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const CATEGORIES = [
  { id: 'political', label: 'Political / Electoral' },
  { id: 'financial-scam', label: 'Financial Scam' },
  { id: 'impersonation', label: 'Impersonation' },
  { id: 'communal', label: 'Communal Incitement' },
  { id: 'market-manipulation', label: 'Market Manipulation' },
  { id: 'ncii', label: 'Non-Consensual Imagery' },
  { id: 'other', label: 'Other' },
];

const api = express.Router();

// ---- Auth middleware ------------------------------------------------------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? store.sessionUser(token) : null;
  if (!user) return res.status(401).json({ error: 'authentication required' });
  req.user = user;
  req.token = token;
  next();
}

function requireAdmin(req, res, next) {
  if (!store.isAdmin(req.user)) return res.status(403).json({ error: 'administrator access required' });
  next();
}

api.get('/health', async (req, res) => {
  const engine = await engineAvailable();
  res.json({
    ok: true,
    service: 'abhijnana-api',
    version: '2.0.0',
    engine: engine ? 'online' : 'offline',
    engineUrl: engine ? ENGINE_URL : null,
  });
});

api.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const session = store.login(username || '', password || '');
  if (!session) return res.status(401).json({ error: 'invalid username or password' });
  res.json(session);
});

api.post('/auth/logout', requireAuth, (req, res) => {
  store.logout(req.token);
  res.json({ ok: true });
});

api.get('/auth/me', requireAuth, (req, res) => res.json(req.user));

api.get('/meta', cacheMiddleware(300), (req, res) => {
  res.json({
    keyId: 'abhijnana-root-2026',
    publicKey: store.getPublicKey(),
    categories: CATEGORIES,
    agencies: store.agencies,
  });
});

api.get('/stats', cacheMiddleware(30), (req, res) => res.json(store.stats()));

api.get('/records', cacheMiddleware(60), (req, res) => {
  const { category, status, q } = req.query;
  let records = store.getRecords();
  if (category) records = records.filter((r) => r.category === category);
  if (status) records = records.filter((r) => r.status === status);
  if (q) {
    const needle = q.toLowerCase();
    records = records.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        r.caseReference.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle)
    );
  }
  records = [...records].sort((a, b) => new Date(b.flaggedAt) - new Date(a.flaggedAt));
  res.json(records);
});

api.get('/records/:id', cacheMiddleware(60), (req, res) => {
  const rec = store.getRecord(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
});

api.get('/records/:id/video', (req, res) => {
  const { id } = req.params;
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const match = files.find((f) => f.startsWith(id + '.'));
    if (!match) {
      return res.status(404).json({ error: 'video file not found' });
    }
    res.sendFile(path.resolve(UPLOADS_DIR, match));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a record — now requires a video file for real engine indexing.
api.post('/records', requireAuth, upload.single('video'), async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.reason) {
    return res.status(400).json({ error: 'title and reason are required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'a video file is required to index the record' });
  }
  if (!(await engineAvailable())) {
    return res.status(503).json({ error: 'matching engine is offline, cannot index record' });
  }

  const rec = store.createRecord({ ...b, authorityId: req.user.agencyId, flaggedBy: req.user.name });

  try {
    const FormData = (await import('node:buffer')).File
      ? globalThis.FormData
      : (await import('undici')).FormData;

    const form = new FormData();
    form.append('record_id', rec.id);
    const videoBytes = fs.readFileSync(req.file.path);
    form.append('video', new Blob([videoBytes]), req.file.originalname || 'video.mp4');

    const engineRes = await fetch(`${ENGINE_URL}/ingest`, {
      method: 'POST',
      body: form,
    });
    if (!engineRes.ok) {
      const errorText = await engineRes.text();
      throw new Error(errorText || `HTTP ${engineRes.status}`);
    }
    const engineData = await engineRes.json();
    rec.engineIndexed = engineData.ok || false;
    rec.engineWindows = engineData.windows || 0;
  } catch (err) {
    console.error('  [api] engine ingest failed:', err.message);
    // Clean up the record from store/database as ingest failed
    const db = store.getDb();
    db.prepare('DELETE FROM events WHERE record_id = ?').run(rec.id);
    db.prepare('DELETE FROM records WHERE id = ?').run(rec.id);
    return res.status(500).json({ error: `failed to index video in matching engine: ${err.message}` });
  } finally {
    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch {}
  }

  // Invalidate caches
  invalidatePrefix('api_cache:/api/records');
  invalidatePrefix('api_cache:/api/stats');
  invalidatePrefix('api_cache:/api/audit');

  res.status(201).json(rec);
});

api.post('/records/:id/revoke', requireAuth, async (req, res) => {
  const rec = store.revokeRecord(req.params.id, req.user.name, req.body?.note);
  if (!rec) return res.status(404).json({ error: 'not found' });

  // De-index from the engine if available.
  if (await engineAvailable()) {
    try {
      await fetch(`${ENGINE_URL}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: req.params.id }),
      });
    } catch (err) {
      console.error('  [api] engine remove failed:', err.message);
    }
  }

  // Invalidate caches
  invalidatePrefix('api_cache:/api/records');
  invalidatePrefix('api_cache:/api/stats');
  invalidatePrefix('api_cache:/api/audit');
  invalidatePrefix(`api_cache:/api/verify/${req.params.id}`);

  res.json(rec);
});

api.get('/verify/:id', cacheMiddleware(60), (req, res) => {
  const rec = store.getRecord(req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json({
    record: rec,
    signatureValid: rec.signatureValid,
    keyId: rec.signedBy,
    publicKey: store.getPublicKey(),
    audit: store.verifyAuditChain(),
  });
});

// Check a video — uses the real engine exclusively.
api.post('/check', upload.single('video'), async (req, res) => {
  let tempPath = null;
  let originalName = 'video.mp4';

  try {
    if (req.file) {
      tempPath = req.file.path;
      originalName = req.file.originalname || 'video.mp4';
    } else if (req.body && req.body.url) {
      const url = req.body.url.trim();
      if (!url) {
        return res.status(400).json({ error: 'Either a video file or a video URL must be provided' });
      }
      console.log(`  [api] downloading query video from URL: ${url}`);
      tempPath = path.join(UPLOADS_DIR, `query-${randomUUID()}.mp4`);
      await downloadVideo(url, tempPath);
      originalName = path.basename(url) || 'video.mp4';
    } else {
      return res.status(400).json({ error: 'Either a video file or a video URL must be provided' });
    }

    if (!(await engineAvailable())) {
      return res.status(503).json({ error: 'matching engine is offline' });
    }

    const FormData = (await import('node:buffer')).File
      ? globalThis.FormData
      : (await import('undici')).FormData;

    const form = new FormData();
    const videoBytes = fs.readFileSync(tempPath);
    form.append('video', new Blob([videoBytes]), originalName);

    const engineRes = await fetch(`${ENGINE_URL}/search`, {
      method: 'POST',
      body: form,
    });

    if (!engineRes.ok) {
      const errorText = await engineRes.text();
      throw new Error(errorText || `HTTP ${engineRes.status}`);
    }

    const result = await engineRes.json();

    // Resolve the full record from the store if we got a match.
    if (result.record && result.record.id) {
      result.record = store.getRecord(result.record.id) || result.record;
    }

    // Record the query in the store (audit trail).
    store.recordQuery(result);
    
    // Invalidate stats/audit because query count changed
    invalidatePrefix('api_cache:/api/stats');
    invalidatePrefix('api_cache:/api/audit');

    return res.json(result);
  } catch (err) {
    console.error('  [api] search failed:', err.message);
    return res.status(500).json({ error: `Search failed: ${err.message}` });
  } finally {
    // Clean up temp file
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }
});

api.get('/audit', cacheMiddleware(30), (req, res) => {
  res.json({ entries: [...store.getAudit()].reverse(), verification: store.verifyAuditChain() });
});

api.get('/disputes', (req, res) => res.json(store.getDisputes()));

api.post('/disputes', (req, res) => {
  const b = req.body || {};
  if (!b.recordId || !b.grounds) return res.status(400).json({ error: 'recordId and grounds are required' });
  invalidatePrefix('api_cache:/api/stats');
  res.status(201).json(store.fileDispute(b));
});

api.get('/reports', (req, res) => res.json(store.getReports()));

api.post('/reports', (req, res) => {
  const b = req.body || {};
  if (!b.description || !b.description.trim()) {
    return res.status(400).json({ error: 'a short description of the video is required' });
  }
  if (b.kind !== 'file' && !(b.url && b.url.trim())) {
    return res.status(400).json({ error: 'a link to the video is required' });
  }
  invalidatePrefix('api_cache:/api/stats');
  res.status(201).json(store.fileReport(b));
});

api.get('/agencies', (req, res) => res.json(store.agencies));

api.get('/users', requireAuth, (req, res) => res.json(store.getUsers()));

api.post('/users', requireAuth, requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: 'name is required' });
  if (!b.role || !b.role.trim()) return res.status(400).json({ error: 'role is required' });
  if (!b.password || String(b.password).length < 8) {
    return res.status(400).json({ error: 'a password of at least 8 characters is required' });
  }
  try {
    const user = store.createUser({ ...b, createdBy: req.user.name });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message || 'could not create the account' });
  }
});

api.post('/reset', (req, res) => {
  store.reset();
  res.json({ ok: true });
});

app.use('/api', api);

const PORT = process.env.PORT || 4317;
app.listen(PORT, async () => {
  const engine = await engineAvailable();
  console.log(`\n  ABHIJÑĀNA API listening on http://localhost:${PORT}`);
  console.log(`  Engine: ${engine ? `REAL (${ENGINE_URL})` : 'OFFLINE (engine required)'}`);
  console.log();
});
