'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return <>{children}</>;
  return (
    <div className="grid min-h-screen place-items-center bg-sand p-6 text-center">
      <div>
        <ShieldAlert className="mx-auto mb-4" size={40} />
        <h1 className="font-serif text-2xl font-semibold">Bu alana erişim yetkiniz yok</h1>
        <p className="mt-2 text-muted">Yönetim paneli yalnızca yönetici hesapları içindir.</p>
        <Link href="/" className="btn-primary mt-6">
          Mağazaya Dön
        </Link>
      </div>
    </div>
  );
}

/** Oturum yoksa giriş sayfasına yönlendirir (RequireAuth), yönetici değilse 403 ekranı gösterir. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth fallback={<p className="p-10 text-center text-muted">Yükleniyor…</p>}>
      <AdminOnly>{children}</AdminOnly>
    </RequireAuth>
  );
}
