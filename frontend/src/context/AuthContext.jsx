import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const USER_KEY = 'cms_user';
const AuthContext = createContext(null);

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setUser(readUser());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, _password, role) => {
    const next = {
      email,
      role: role || 'student',
      full_name: email.split('@')[0] || 'User',
    };
    localStorage.setItem(USER_KEY, JSON.stringify(next));
    setUser(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
