'use client';

import { LayoutDashboard, LogOut, MapPin, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <>
      <Breadcrumb items={[{ label: 'Hesabım' }]} />
      <RequireAuth>
        <div className="container-page pb-16">
          <h1 className="font-serif text-[34px] font-semibold">Merhaba, {user?.firstName}</h1>
          <p className="mt-1 text-muted">{user?.email}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {user?.role === 'admin' && (
              <Link href="/yonetim" className="flex items-center gap-3 rounded-xl border border-charcoal bg-charcoal p-5 text-white shadow-card hover:shadow-card-hover">
                <LayoutDashboard /> <span className="font-bold">Yönetim Paneli</span>
              </Link>
            )}
            <Link href="/hesabim/siparisler" className="flex items-center gap-3 rounded-xl border border-line bg-white p-5 shadow-card hover:shadow-card-hover">
              <Package /> <span className="font-bold">Siparişlerim</span>
            </Link>
            <Link href="/odeme" className="flex items-center gap-3 rounded-xl border border-line bg-white p-5 shadow-card hover:shadow-card-hover">
              <MapPin /> <span className="font-bold">Adreslerim & Ödeme</span>
            </Link>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="flex items-center gap-3 rounded-xl border border-line bg-white p-5 text-left shadow-card hover:shadow-card-hover"
            >
              <LogOut /> <span className="font-bold">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </RequireAuth>
    </>
  );
}
