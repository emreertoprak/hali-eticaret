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
  loginWithGoogle: (credential: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  /** Şifre sıfırlama / değiştirme gibi oturum döndüren işlemlerin sonucunu uygular. */
  applySession: (auth: AuthResponse) => void;
  logout: () => Promise<void>;
  /** Access token ekleyerek istek atar; süresi dolmuşsa çerezle bir kez yeniler. */
  authFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Oturum modeli: kısa ömürlü access token yalnızca bellekte tutulur (localStorage'a yazılmaz);
 * refresh token API'nin koyduğu httpOnly çerezdedir ve JS tarafından okunamaz. Sayfa yenilendiğinde
 * /auth/refresh çağrısı çerezle yeni bir access token alır.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const accessToken = useRef<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const applySession = useCallback((auth: AuthResponse | null) => {
    accessToken.current = auth?.accessToken ?? null;
    setUser(auth?.user ?? null);
  }, []);

  const refresh = useCallback((): Promise<string | null> => {
    refreshing.current ??= apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', credentials: 'same-origin' })
      .then((auth) => {
        applySession(auth);
        return auth.accessToken;
      })
      .catch(() => {
        applySession(null);
        return null;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [applySession]);

  const authFetch = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const withToken = (token: string | null): RequestInit => ({
        ...init,
        headers: { ...(init.headers as Record<string, string>), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      try {
        return await apiFetch<T>(path, withToken(accessToken.current));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const token = await refresh();
          if (token) return apiFetch<T>(path, withToken(token));
        }
        throw err;
      }
    },
    [refresh],
  );

  useEffect(() => {
    // Önceki sürümün localStorage'da tuttuğu tokenları temizle.
    storage.set(STORAGE_KEYS.accessToken, null);
    storage.set(STORAGE_KEYS.refreshToken, null);
    // Oturum işaret çerezi yoksa (hiç giriş yapılmamış) yenileme denemeye gerek yok.
    if (!/(?:^|;\s*)he_session=1/.test(document.cookie)) {
      setReady(true);
      return;
    }
    void refresh().finally(() => setReady(true));
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      applySession(auth);
      return auth.user;
    },
    [applySession],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const auth = await apiFetch<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
      applySession(auth);
      return auth.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const auth = await apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
      applySession(auth);
      return auth.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    applySession(null);
    storage.set(STORAGE_KEYS.cartToken, null);
  }, [applySession]);

  const value = useMemo(
    () => ({ user, ready, login, loginWithGoogle, register, applySession, logout, authFetch }),
    [user, ready, login, loginWithGoogle, register, applySession, logout, authFetch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
