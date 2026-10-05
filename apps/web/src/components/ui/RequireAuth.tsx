'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

/** Giriş gerektiren sayfalarda kullanıcıyı giriş sayfasına yönlendirir. */
export function RequireAuth({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return fallback ?? <p className="py-24 text-center text-muted">Yükleniyor…</p>;
  return <>{children}</>;
}
