'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  if (!ready || !user) return <p className="p-10 text-center text-muted">Yükleniyor…</p>;
  if (user.role !== 'admin') {
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
  return <>{children}</>;
}
