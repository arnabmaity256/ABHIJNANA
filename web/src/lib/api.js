const BASE = '/api';
const SESSION_KEY = 'abhijnana.session';

// Initialised synchronously from storage so the token is present on the very
// first request after a page refresh (before the AuthProvider effect runs).
let authToken = (() => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.token || null;
  } catch {
    return null;
  }
})();

export function setAuthToken(token) {
  authToken = token || null;
}

async function req(path, opts = {}) {
  const headers = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
  let body = undefined;
  if (opts.body) {
    if (opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(BASE + path, {
    headers,
    ...opts,
    body,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  authLogin: (body) => req('/auth/login', { method: 'POST', body }),
  authLogout: () => req('/auth/logout', { method: 'POST' }),
  authMe: () => req('/auth/me'),
  authChangePassword: (body) => req('/auth/change-password', { method: 'POST', body }),
  users: () => req('/users'),
  meta: () => req('/meta'),
  stats: () => req('/stats'),
  records: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return req('/records' + (q ? `?${q}` : ''));
  },
  record: (id) => req(`/records/${id}`),
  createRecord: (body) => req('/records', { method: 'POST', body }),
  revokeRecord: (id, body) => req(`/records/${id}/revoke`, { method: 'POST', body }),
  verify: (id) => req(`/verify/${id}`),
  check: (body) => req('/check', { method: 'POST', body }),
  audit: () => req('/audit'),
  disputes: () => req('/disputes'),
  fileDispute: (body) => req('/disputes', { method: 'POST', body }),
  reports: () => req('/reports'),
  fileReport: (body) => req('/reports', { method: 'POST', body }),
  agencies: () => req('/agencies'),
  createUser: (body) => req('/users', { method: 'POST', body }),
  reset: () => req('/reset', { method: 'POST' }),
};
