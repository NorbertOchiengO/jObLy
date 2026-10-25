import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  // Restore the session after a page refresh
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    let cancelled = false;
    getMe()
      .then((res) => { if (!cancelled) setUser(res.data); })
      .catch((err) => {
        // Only forget the token if the server rejected it, not when the network is down
        if (err.response && [401, 404].includes(err.response.status)) localStorage.removeItem('token');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Token expired / rejected mid-session
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const signIn = useCallback(async (token) => {
    localStorage.setItem('token', token);
    const res = await getMe();
    setUser(res.data);
    return res.data;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // legacy key from the old register flow
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
