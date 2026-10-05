'use client';

import { ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { useCart } from '@/context/CartContext';

import { CartLine } from './CartLine';
import { CartSummary } from './CartSummary';

export function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, error, clearError } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;
  const items = cart?.items ?? [];

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label="Sepetim">
      <button className="absolute inset-0 bg-charcoal/40" aria-label="Sepeti kapat" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-line bg-cream px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShoppingBag size={20} /> Sepetim <span className="text-muted">({cart?.itemCount ?? 0})</span>
          </h2>
          <button aria-label="Kapat" className="p-1" onClick={() => setDrawerOpen(false)}>
            <X size={22} />
          </button>
        </div>
        {error && (
          <p role="alert" className="mx-5 mt-3 rounded-lg bg-brand-red/10 px-3 py-2 text-[13px] text-brand-red-deep" onClick={clearError}>
            {error}
          </p>
        )}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="font-serif text-xl">Sepetiniz boş</p>
            <Link href="/urunler" onClick={() => setDrawerOpen(false)} className="btn-primary">
              Alışverişe Başla
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map((item) => (
                <CartLine key={item.id} item={item} compact />
              ))}
            </ul>
            <div className="space-y-3 border-t border-line p-5">
              <CartSummary cart={cart!} />
              <Link href="/odeme" onClick={() => setDrawerOpen(false)} className="btn-primary w-full">
                Siparişi Tamamla
              </Link>
              <Link href="/sepet" onClick={() => setDrawerOpen(false)} className="btn-outline w-full">
                Sepete Git
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
