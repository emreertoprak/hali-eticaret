'use client';

import { ChevronDown, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import type { Category } from '@/lib/types';

import { Logo } from './Logo';
import { SearchBox } from './SearchBox';

export const NAV_LINKS = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/urunler', label: 'Tüm Ürünler' },
  { href: '/hesabim/siparisler', label: 'Siparişler' },
  { href: '/koleksiyonlar', label: 'Koleksiyonlar' },
  { href: '/yakinda', label: 'Yakında' },
];

export function Header({ brand, categories }: { brand: string; categories: Category[] }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { cart, setDrawerOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const itemCount = cart?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-50">
      <div className="relative border-b border-line bg-cream">
        <div className="container-page flex h-16 items-center justify-between gap-4 md:h-20">
          <button className="-ml-2 p-2 lg:hidden" aria-label="Menüyü aç" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>

          <Logo name={brand} />

          <nav aria-label="Ana menü" className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[15px] transition-colors hover:text-ink ${isActive(link.href) ? 'font-semibold text-ink' : 'text-ink/75'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 md:gap-3">
            <button className="hidden items-center gap-1 px-2 text-[12px] font-semibold md:flex" aria-label="Para birimi ve dil">
              <span className="size-2.5 rounded-full bg-brand-red ring-2 ring-brand-red/20" />
              TRY / TR
              <ChevronDown size={14} />
            </button>
            <button className="p-2" aria-label="Ara" onClick={() => setSearchOpen((v) => !v)}>
              <Search size={20} strokeWidth={1.8} />
            </button>
            <Link href={user ? '/hesabim' : '/giris'} className="hidden p-2 sm:block" aria-label={user ? 'Hesabım' : 'Giriş yap'}>
              <User size={20} strokeWidth={1.8} />
            </Link>
            <button className="relative p-2" aria-label={`Sepet (${itemCount} ürün)`} onClick={() => setDrawerOpen(true)}>
              <ShoppingBag size={20} strokeWidth={1.8} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <SearchBox open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>

      <Link href="/urunler" className="block bg-ribbon py-2.5 text-center text-[13px] font-semibold tracking-[0.06em] uppercase hover:bg-[#dcdcdc]">
        Tüm Halılar İçin Tıklayınız
      </Link>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button className="absolute inset-0 bg-charcoal/40" aria-label="Menüyü kapat" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white shadow-float">
            <div className="flex items-center justify-between border-b border-line bg-cream px-4 py-4">
              <Logo name={brand} />
              <button className="p-2" aria-label="Menüyü kapat" onClick={() => setMenuOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col px-4 py-2">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="border-b border-line py-3 font-semibold">
                  {link.label}
                </Link>
              ))}
              <Link href={user ? '/hesabim' : '/giris'} className="border-b border-line py-3 font-semibold">
                {user ? 'Hesabım' : 'Giriş Yap / Üye Ol'}
              </Link>
            </nav>
            <p className="label-eyebrow px-4 pt-4 text-muted">Kategoriler</p>
            <ul className="grid grid-cols-2 gap-x-3 px-4 py-2 text-[14px]">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/kategori/${c.slug}`} className="block py-2 text-ink/80 hover:text-ink">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </header>
  );
}
