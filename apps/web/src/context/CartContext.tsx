'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ApiError } from '@/lib/api';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import type { Cart } from '@/lib/types';

import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (variantId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  reload: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { authFetch, user, ready } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = storage.get(STORAGE_KEYS.cartToken);
      const next = await authFetch<Cart>(path, {
        ...init,
        headers: { ...(token ? { 'X-Cart-Token': token } : {}) },
      });
      storage.set(STORAGE_KEYS.cartToken, next.token);
      setCart(next);
      return next;
    },
    [authFetch],
  );

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setLoading(true);
      setError(null);
      try {
        await fn();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Sepet güncellenemedi.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reload = useCallback(() => run(() => request('/cart')).catch(() => undefined), [run, request]);

  // Oturum durumu değişince sepeti yeniden çek (girişte misafir sepeti birleşir).
  useEffect(() => {
    if (ready) void reload();
  }, [ready, user?.id, reload]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      drawerOpen,
      setDrawerOpen,
      error,
      clearError: () => setError(null),
      reload,
      addItem: (variantId, quantity = 1) =>
        run(async () => {
          await request('/cart/items', { method: 'POST', body: JSON.stringify({ variantId, quantity }) });
          setDrawerOpen(true);
        }),
      updateItem: (itemId, quantity) =>
        run(() => request(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })),
      removeItem: (itemId) => run(() => request(`/cart/items/${itemId}`, { method: 'DELETE' })),
    }),
    [cart, loading, drawerOpen, error, reload, run, request],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart CartProvider içinde kullanılmalı');
  return ctx;
}
