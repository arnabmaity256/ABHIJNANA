// In-memory-compatible data store backed by SQLite.
//
// Key invariant preserved: only *source* data is persisted; all cryptographic
// and derived fields (signatures, audit hash-chain, contentDigest, agency
// labels) are recomputed on every read. This keeps signatures and the hash
// chain valid across restarts.
//
// The export surface is identical to the prototype's in-memory store so
// index.js (API routes) requires zero changes.
import { getDb, migrate } from './db.js';
import {
  signRecord, verifyRecord, contentDigest, chainHash, KEY_ID, publicKeyPem,
  hashPassword, verifyPassword, newToken,
} from './crypto.js';
import * as seed from './seed.js';

const WINDOW_STEP = 0.75;

function windowsFor(durationSec) {
  return Math.max(4, Math.round(durationSec / WINDOW_STEP));
}

function agencyById(id) {
  return seed.agencies.find((a) => a.id === id);
}

// ---- Decoration (same as prototype) --------------------------------------
// Attach signature + derived presentation fields to a record row.
function decorate(rec) {
  const agency = agencyById(rec.authorityId) || { name: rec.authorityId, short: rec.authorityId };
  const signaturePayload = {
    id: rec.id,
    caseReference: rec.caseReference,
    authorityId: rec.authorityId,
    legalStatus: rec.legalStatus,
    flaggedAt: rec.flaggedAt,
    reason: rec.reason,
    durationSec: rec.durationSec,
  };
  const signature = signRecord(signaturePayload);
  return {
    ...rec,
    issuingAuthority: agency.name,
    authorityShort: agency.short,
    fingerprintWindows: windowsFor(rec.durationSec),
    contentDigest: contentDigest(signaturePayload),
    signature,
    signedBy: KEY_ID,
    signatureValid: verifyRecord(signaturePayload, signature),
  };
}

// ---- Row ↔ Object mapping ------------------------------------------------
// SQLite uses snake_case columns; the API uses camelCase. These helpers
// translate between the two so the rest of the codebase stays unchanged.

function recordFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    caseReference: row.case_reference,
    authorityId: row.authority_id,
    jurisdiction: row.jurisdiction,
    legalStatus: row.legal_status,
    reason: row.reason,
    flaggedBy: row.flagged_by,
    flaggedAt: row.flagged_at,
    durationSec: row.duration_sec,
    sourceLabel: row.source_label,
    status: row.status,
    severity: row.severity,
  };
}

function userFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    agencyId: row.agency_id,
    clearance: row.clearance,
    passwordHash: row.password_hash,
    salt: row.salt,
  };
}

function disputeFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    recordId: row.record_id,
    filedBy: row.filed_by,
    contact: row.contact,
    grounds: row.grounds,
    status: row.status,
    filedAt: row.filed_at,
  };
}

function reportFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    mediaLabel: row.media_label,
    url: row.url,
    category: row.category,
    description: row.description,
    reportedBy: row.reported_by,
    contact: row.contact,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

function eventFromRow(row) {
  if (!row) return null;
  return {
    action: row.action,
    recordId: row.record_id,
    actor: row.actor,
    authority: row.authority,
    detail: row.detail,
    timestamp: row.timestamp,
  };
}

function queryFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    verdict: row.verdict,
    recordId: row.record_id,
    kind: row.kind,
    value: row.value,
    at: row.at,
  };
}

// Strip secrets and attach the resolved agency name/short for the client.
function publicUser(u) {
  const { passwordHash, salt, password, ...safe } = u;
  const agency = agencyById(u.agencyId) || {};
  return { ...safe, agencyName: agency.name || u.agencyId, agencyShort: agency.short || u.agencyId };
}

// ---- Audit chain (recomputed from DB rows on every read) -----------------

function buildAuditFromDb() {
  const db = getDb();
  const records = db.prepare('SELECT * FROM records ORDER BY flagged_at').all().map(recordFromRow).map(decorate);
  const extraEvents = db.prepare('SELECT * FROM events ORDER BY timestamp').all().map(eventFromRow);

  const entries = [];
  for (const r of records) {
    entries.push({
      action: 'FLAG_CREATED',
      recordId: r.id,
      actor: r.flaggedBy,
      authority: r.authorityId,
      detail: `Record ${r.id} created — "${r.title}" (${r.legalStatus})`,
      timestamp: r.flaggedAt,
    });
    entries.push({
      action: 'RECORD_SIGNED',
      recordId: r.id,
      actor: 'system',
      authority: r.authorityId,
      detail: `ed25519 signature committed · digest ${r.contentDigest}`,
      timestamp: new Date(new Date(r.flaggedAt).getTime() + 4000).toISOString(),
    });
  }
  for (const e of extraEvents) entries.push({ ...e });
  entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let prevHash = null;
  return entries.map((e, i) => {
    const withSeq = { ...e, seq: i + 1 };
    const hash = chainHash(prevHash, withSeq);
    const linked = { ...withSeq, prevHash, hash };
    prevHash = hash;
    return linked;
  });
}

// ---- Init & Seed ---------------------------------------------------------

function defaultUsername(name) {
  return (
    String(name || 'operator')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 24) || 'operator'
  );
}

function seedDatabase() {
  const db = getDb();

  // Only seed if the users table is empty.
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;

  console.log('  [db] seeding initial operator accounts …');

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, username, role, agency_id, clearance, password_hash, salt)
    VALUES (@id, @name, @username, @role, @agencyId, @clearance, @passwordHash, @salt)
  `);

  const txn = db.transaction(() => {
    for (const u of seed.users) {
      const { password, ...rest } = u;
      const withName = { username: u.username || defaultUsername(u.name), ...rest };
      const creds = hashPassword(password || 'changeme');
      insertUser.run({ ...withName, ...creds });
    }
  });
  txn();
}

export function init() {
  migrate();
  seedDatabase();
  console.log('  [db] store initialised (SQLite)');
}

export function reset() {
  const db = getDb();
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM queries');
  db.exec('DELETE FROM events');
  db.exec('DELETE FROM disputes');
  db.exec('DELETE FROM reports');
  db.exec('DELETE FROM fingerprints');
  db.exec('DELETE FROM index_status');
  db.exec('DELETE FROM records');
  db.exec('DELETE FROM users');
  seedDatabase();
}

// ---- Reads ---------------------------------------------------------------

export const agencies = seed.agencies;

export function getUsers() {
  const db = getDb();
  return db.prepare('SELECT * FROM users').all().map(userFromRow).map(publicUser);
}

export function getRecords() {
  const db = getDb();
  return db.prepare('SELECT * FROM records ORDER BY flagged_at DESC').all().map(recordFromRow).map(decorate);
}

export function getRecord(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  if (!row) return null;
  return decorate(recordFromRow(row));
}

export function getAudit() {
  return buildAuditFromDb();
}

export function getDisputes() {
  const db = getDb();
  return db.prepare('SELECT * FROM disputes ORDER BY filed_at DESC').all().map(disputeFromRow);
}

export function getReports() {
  const db = getDb();
  return db.prepare('SELECT * FROM reports ORDER BY submitted_at DESC').all().map(reportFromRow);
}

export function getQueries() {
  const db = getDb();
  return db.prepare('SELECT * FROM queries ORDER BY at DESC').all().map(queryFromRow);
}

export function getPublicKey() {
  return publicKeyPem();
}

export function verifyAuditChain() {
  const audit = buildAuditFromDb();
  let prev = null;
  for (const e of audit) {
    const expected = chainHash(prev, e);
    if (expected !== e.hash) return { valid: false, brokenAt: e.seq };
    prev = e.hash;
  }
  return { valid: true, length: audit.length };
}

export function stats() {
  const db = getDb();

  const totalRecords = db.prepare('SELECT COUNT(*) as c FROM records').get().c;
  const activeRecords = db.prepare("SELECT COUNT(*) as c FROM records WHERE status = 'active'").get().c;
  const revokedRecords = db.prepare("SELECT COUNT(*) as c FROM records WHERE status = 'revoked'").get().c;
  const underReview = db.prepare("SELECT COUNT(*) as c FROM records WHERE legal_status = 'Under Review'").get().c;

  // Indexed windows — sum of computed windows across all records.
  const records = db.prepare('SELECT duration_sec FROM records').all();
  const indexedWindows = records.reduce((s, r) => s + windowsFor(r.duration_sec), 0);

  const publicQueries = db.prepare('SELECT COUNT(*) as c FROM queries').get().c
    + db.prepare("SELECT COUNT(*) as c FROM events WHERE action = 'PUBLIC_QUERY'").get().c;

  const openDisputes = db.prepare("SELECT COUNT(*) as c FROM disputes WHERE status NOT IN ('upheld', 'rejected')").get().c;
  const newReports = db.prepare("SELECT COUNT(*) as c FROM reports WHERE status = 'new'").get().c;
  const totalReports = db.prepare('SELECT COUNT(*) as c FROM reports').get().c;

  const byCategoryRows = db.prepare("SELECT category, COUNT(*) as c FROM records WHERE status = 'active' GROUP BY category").all();
  const byCategory = {};
  for (const row of byCategoryRows) byCategory[row.category] = row.c;

  return {
    totalRecords,
    activeRecords,
    revokedRecords,
    underReview,
    indexedWindows,
    publicQueries,
    openDisputes,
    newReports,
    totalReports,
    agencies: seed.agencies.length,
    byCategory,
  };
}

// ---- Authentication ------------------------------------------------------

export function login(username, password) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(String(username || ''));
  if (!row) return null;
  const u = userFromRow(row);
  if (!verifyPassword(password, u.salt, u.passwordHash)) return null;

  const token = newToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, u.id, expiresAt);
  return { token, user: publicUser(u) };
}

export function sessionUser(token) {
  const db = getDb();
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token);
  if (!session) return null;

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id);
  return row ? publicUser(userFromRow(row)) : null;
}

export function logout(token) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function isAdmin(user) {
  return user?.role === 'System Administrator';
}

export function changePassword(userId, oldPassword, newPassword) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) return false;
  const u = userFromRow(row);
  if (!verifyPassword(oldPassword, u.salt, u.passwordHash)) return false;

  const creds = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(creds.passwordHash, creds.salt, userId);

  // Invalidate all active sessions for this user
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

  // Log in events
  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'USER_PASSWORD_CHANGED', null, u.name, u.agencyId,
    `Password updated for operator account ${u.id} (${u.name})`,
    new Date().toISOString(),
  );

  return true;
}

// ---- Writes --------------------------------------------------------------

let counter = null;
function nextRecordId() {
  if (counter === null) {
    const db = getDb();
    const lastId = db.prepare('SELECT id FROM records ORDER BY id DESC LIMIT 1').pluck().get();
    if (lastId) {
       const m = lastId.match(/-(\d+)$/);
       counter = m ? parseInt(m[1], 10) : 200;
    } else {
       counter = 200;
    }
  }
  counter += 1;
  return `ABJ-2026-${String(counter).padStart(6, '0')}`;
}

let auditCounter = 0;
function nextEventId() {
  auditCounter += 1;
  return `EVT-${Date.now()}-${auditCounter}`;
}

export function createRecord(input) {
  const db = getDb();
  const id = nextRecordId();
  const payload = {
    id,
    title: input.title,
    category: input.category,
    caseReference: input.caseReference,
    authorityId: input.authorityId,
    jurisdiction: input.jurisdiction,
    legalStatus: input.legalStatus || 'Confirmed Fake',
    reason: input.reason,
    flaggedBy: input.flaggedBy,
    flaggedAt: new Date().toISOString(),
    durationSec: Number(input.durationSec) || 30,
    sourceLabel: input.sourceLabel || 'uploaded_evidence.mp4',
    status: 'active',
    severity: input.severity || 'medium',
  };

  db.prepare(`
    INSERT INTO records (id, title, category, case_reference, authority_id, jurisdiction, legal_status, reason, flagged_by, flagged_at, duration_sec, source_label, status, severity)
    VALUES (@id, @title, @category, @caseReference, @authorityId, @jurisdiction, @legalStatus, @reason, @flaggedBy, @flaggedAt, @durationSec, @sourceLabel, @status, @severity)
  `).run(payload);

  const now = payload.flaggedAt;
  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'FLAG_CREATED', id, payload.flaggedBy, payload.authorityId,
    `Record ${id} created — "${payload.title}" (${payload.legalStatus})`, now,
  );
  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'RECORD_SIGNED', id, 'system', payload.authorityId,
    `ed25519 signature committed · digest ${contentDigest({ id, caseReference: payload.caseReference, authorityId: payload.authorityId, legalStatus: payload.legalStatus, flaggedAt: now, reason: payload.reason, durationSec: payload.durationSec })}`,
    new Date(Date.now() + 3000).toISOString(),
  );

  return decorate(payload);
}

export function revokeRecord(id, actor, note) {
  const db = getDb();
  const rec = getRecord(id);
  if (!rec) return null;

  db.prepare("UPDATE records SET status = 'revoked', legal_status = 'Revoked' WHERE id = ?").run(id);

  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'RECORD_REVOKED', id, actor || 'System Administrator', rec.authorityId,
    note || `Record ${id} revoked`, new Date().toISOString(),
  );

  return getRecord(id);
}

export function recordQuery(result) {
  const db = getDb();
  const entry = {
    id: nextEventId(),
    verdict: result.verdict,
    recordId: result.record ? result.record.id : null,
    kind: result.query.kind,
    value: result.query.value,
    at: result.checkedAt,
  };

  db.prepare('INSERT INTO queries (id, verdict, record_id, kind, value, at) VALUES (@id, @verdict, @recordId, @kind, @value, @at)').run(entry);

  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    result.verdict === 'clear' ? 'PUBLIC_QUERY' : 'MATCH_RETURNED',
    entry.recordId, 'anonymous', 'public-portal',
    result.verdict === 'clear'
      ? 'Public check — no match against the registry'
      : `Public check — ${result.verdict.toUpperCase()} on ${entry.recordId} (${result.segments[0]?.channel} channel)`,
    result.checkedAt,
  );

  return entry;
}

export function fileDispute(input) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM disputes').get().c;
  const id = `APP-2026-${String(1000 + count).slice(1)}`;
  const dispute = {
    id,
    recordId: input.recordId,
    filedBy: input.filedBy || 'Anonymous applicant',
    contact: input.contact || '',
    grounds: input.grounds,
    status: 'open',
    filedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO disputes (id, record_id, filed_by, contact, grounds, status, filed_at)
    VALUES (@id, @recordId, @filedBy, @contact, @grounds, @status, @filedAt)
  `).run(dispute);

  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'DISPUTE_FILED', input.recordId, dispute.filedBy, 'appeals',
    `Appeal ${id} filed against ${input.recordId}; routed to human review`, dispute.filedAt,
  );

  return dispute;
}

export function fileReport(input) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM reports').get().c;
  const id = `REP-2026-${String(1000 + count).slice(1)}`;
  const report = {
    id,
    kind: input.kind === 'file' ? 'file' : 'url',
    mediaLabel: input.mediaLabel || input.url || 'submitted_media',
    url: input.url || '',
    category: input.category || 'other',
    description: input.description,
    reportedBy: input.reportedBy || 'Anonymous member of the public',
    contact: input.contact || '',
    status: 'new',
    submittedAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO reports (id, kind, media_label, url, category, description, reported_by, contact, status, submitted_at)
    VALUES (@id, @kind, @mediaLabel, @url, @category, @description, @reportedBy, @contact, @status, @submittedAt)
  `).run(report);

  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'REPORT_SUBMITTED', null, report.reportedBy, 'intake',
    `Public report ${id} submitted for review (${report.category}); queued for triage`, report.submittedAt,
  );

  return report;
}

export function createUser(input) {
  const db = getDb();
  const agency = agencyById(input.agencyId) || seed.agencies[0];
  const username = (input.username && input.username.trim()) || defaultUsername(input.name);

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
  if (existing) throw new Error('that username is already taken');

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const creds = hashPassword(input.password);
  const user = {
    id: `u-${defaultUsername(input.name)}-${userCount + 1}`,
    name: input.name,
    username,
    role: input.role || 'Verification Analyst',
    agencyId: agency.id,
    clearance: input.clearance || 'L2',
    ...creds,
  };

  db.prepare(`
    INSERT INTO users (id, name, username, role, agency_id, clearance, password_hash, salt)
    VALUES (@id, @name, @username, @role, @agencyId, @clearance, @passwordHash, @salt)
  `).run(user);

  db.prepare('INSERT INTO events (action, record_id, actor, authority, detail, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
    'USER_REGISTERED', null, input.createdBy || 'System Administrator', agency.id,
    `Operator account ${user.id} provisioned — ${user.name} (${user.role}, ${user.clearance})`,
    new Date().toISOString(),
  );

  return publicUser(user);
}
