import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from './api.js';

const AuthCtx = createContext(null);
const KEY = 'abhijnana.session';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // session = { token, user } | null
  const [session, setSession] = useState(read);

  useEffect(() => {
    setAuthToken(session?.token || null);
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }, [session]);

  // Revalidate a restored token against the server on load; sign out if the
  // session no longer exists (e.g. the server was restarted).
  useEffect(() => {
    if (!session?.token) return;
    api.authMe().then(
      (user) => setSession((s) => (s ? { ...s, user } : s)),
      () => setSession(null)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (s) => {
    setAuthToken(s?.token || null); // sync immediately so the next request is authed
    setSession(s);
  };
  const logout = () => {
    api.authLogout().catch(() => {});
    setAuthToken(null);
    setSession(null);
  };

  return (
    <AuthCtx.Provider value={{ user: session?.user || null, token: session?.token || null, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
