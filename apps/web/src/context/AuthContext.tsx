'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ApiError, apiFetch } from '@/lib/api';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import type { AuthResponse, User } from '@/lib/types';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  /** Access token ekleyerek istek atar; süresi dolmuşsa bir kez refresh dener. */
  authFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const persist = useCallback((auth: AuthResponse | null) => {
    storage.set(STORAGE_KEYS.accessToken, auth?.accessToken ?? null);
    storage.set(STORAGE_KEYS.refreshToken, auth?.refreshToken ?? null);
    setUser(auth?.user ?? null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = storage.get(STORAGE_KEYS.refreshToken);
    if (!refreshToken) return null;
    refreshing.current ??= apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) })
      .then((auth) => {
        persist(auth);
        return auth.accessToken;
      })
      .catch(() => {
        persist(null);
        return null;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [persist]);

  const authFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const withToken = (token: string | null) => ({
        ...init,
        headers: { ...(init.headers as Record<string, string>), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      try {
        return await apiFetch<T>(path, withToken(storage.get(STORAGE_KEYS.accessToken)));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401 && storage.get(STORAGE_KEYS.refreshToken)) {
          const token = await refresh();
          if (token) return apiFetch<T>(path, withToken(token));
        }
        throw err;
      }
    },
    [refresh],
  );

  useEffect(() => {
    if (!storage.get(STORAGE_KEYS.accessToken) && !storage.get(STORAGE_KEYS.refreshToken)) {
      setReady(true);
      return;
    }
    authFetch<User>('/auth/me')
      .then(setUser)
      .catch(() => persist(null))
      .finally(() => setReady(true));
  }, [authFetch, persist]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      persist(auth);
      return auth.user;
    },
    [persist],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const auth = await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
      persist(auth);
      return auth.user;
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null);
    storage.set(STORAGE_KEYS.cartToken, null);
  }, [persist]);

  const value = useMemo(() => ({ user, ready, login, register, logout, authFetch }), [user, ready, login, register, logout, authFetch]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
