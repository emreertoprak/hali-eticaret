'use client';

import { ExternalLink, FolderTree, Image as ImageIcon, LayoutDashboard, Layers, LogOut, Megaphone, Menu, Package, ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

const NAV = [
  { href: '/yonetim', label: 'Panel', icon: LayoutDashboard },
  { href: '/yonetim/siparisler', label: 'Siparişler', icon: ShoppingCart },
  { href: '/yonetim/urunler', label: 'Ürünler', icon: Package },
  { href: '/yonetim/kategoriler', label: 'Kategoriler', icon: FolderTree },
  { href: '/yonetim/koleksiyonlar', label: 'Koleksiyonlar', icon: Layers },
  { href: '/yonetim/bannerlar', label: 'Bannerlar', icon: ImageIcon },
  { href: '/yonetim/duyurular', label: 'Duyurular', icon: Megaphone },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === '/yonetim' ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Yönetim menüsü" className="flex flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition ${
            isActive(href) ? 'bg-charcoal text-white' : 'text-ink/75 hover:bg-cream hover:text-ink'
          }`}
        >
          <Icon size={18} strokeWidth={1.8} /> {label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-sand">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <Link href="/yonetim" className="border-b border-line px-6 py-5">
          <span className="font-serif text-xl font-semibold tracking-[0.14em]">YÖNETİM</span>
        </Link>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Yönetim menüsü">
          <button className="absolute inset-0 bg-charcoal/40" aria-label="Menüyü kapat" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-float">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-serif text-lg font-semibold tracking-[0.14em]">YÖNETİM</span>
              <button aria-label="Kapat" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-8">
          <button className="-ml-1 p-1 lg:hidden" aria-label="Menüyü aç" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-4 text-[13px]">
            <Link href="/" target="_blank" className="hidden items-center gap-1 font-semibold hover:underline sm:flex">
              Mağazayı Gör <ExternalLink size={13} />
            </Link>
            <span className="text-muted">{user?.email}</span>
            <button
              className="flex items-center gap-1 font-semibold hover:text-brand-red"
              onClick={() => {
                logout();
                router.push('/giris');
              }}
            >
              <LogOut size={15} /> Çıkış
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
