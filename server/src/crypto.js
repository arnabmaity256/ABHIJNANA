// Real cryptography — Layer 4 (Trust, Legal & Governance).
//
// - Every registry record is signed with an ed25519 key held by the authority.
// - The audit log is an append-only, hash-chained ledger.
// - The keypair is now PERSISTENT: loaded from disk on startup, generated once
//   on first run. Signatures survive restarts.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = path.join(__dirname, '..', 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'authority.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'authority.pub.pem');

export const KEY_ID = 'abhijnana-root-2026';

// ---- Persistent keypair --------------------------------------------------
// Load from disk if available; generate and persist on first run.
let privateKey, publicKey;

function loadOrGenerateKeyPair() {
  fs.mkdirSync(KEYS_DIR, { recursive: true });

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKey = crypto.createPrivateKey(fs.readFileSync(PRIVATE_KEY_PATH, 'utf8'));
    publicKey = crypto.createPublicKey(fs.readFileSync(PUBLIC_KEY_PATH, 'utf8'));
    console.log('  [crypto] loaded signing keypair from disk');
  } else {
    const kp = crypto.generateKeyPairSync('ed25519');
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey.export({ type: 'pkcs8', format: 'pem' }), 'utf8');
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey.export({ type: 'spki', format: 'pem' }), 'utf8');
    console.log('  [crypto] generated new signing keypair → saved to server/keys/');
  }
}

// Initialise eagerly on module load.
loadOrGenerateKeyPair();

// ---- Public API ----------------------------------------------------------

export function publicKeyPem() {
  return publicKey.export({ type: 'spki', format: 'pem' });
}

// Canonical JSON for signing — stable key order so the signature is reproducible.
function canonical(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonical).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
}

export function signRecord(payload) {
  const message = Buffer.from(canonical(payload));
  const signature = crypto.sign(null, message, privateKey);
  return signature.toString('hex');
}

export function verifyRecord(payload, signatureHex) {
  try {
    const message = Buffer.from(canonical(payload));
    return crypto.verify(null, message, publicKey, Buffer.from(signatureHex, 'hex'));
  } catch {
    return false;
  }
}

export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Compute the chain hash for an audit entry given the previous hash.
export function chainHash(prevHash, entry) {
  const body = canonical({
    seq: entry.seq,
    action: entry.action,
    actor: entry.actor,
    authority: entry.authority,
    recordId: entry.recordId,
    detail: entry.detail,
    timestamp: entry.timestamp,
  });
  return sha256((prevHash || 'GENESIS') + '|' + body);
}

// A short public "fingerprint" of the record content used in the UI as a proof token.
export function contentDigest(payload) {
  return sha256(canonical(payload)).slice(0, 32);
}

// ---- Password hashing & session tokens -----------------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, passwordHash };
}

export function verifyPassword(password, salt, passwordHash) {
  if (!salt || !passwordHash) return false;
  const computed = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(passwordHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function newToken() {
  return crypto.randomBytes(24).toString('hex');
}
