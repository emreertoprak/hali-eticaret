'use client';

import Link from 'next/link';

import { CartLine } from '@/components/cart/CartLine';
import { CartSummary } from '@/components/cart/CartSummary';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { cart, error } = useCart();
  const items = cart?.items ?? [];
  const blocked = items.some((i) => !i.available);

  return (
    <>
      <Breadcrumb items={[{ label: 'Sepetim' }]} />
      <div className="container-page pb-16">
        <h1 className="mb-6 font-serif text-[34px] font-semibold">Sepetim</h1>
        {!cart ? (
          <p className="py-16 text-center text-muted">Sepet yükleniyor…</p>
        ) : items.length === 0 ? (
          <EmptyState title="Sepetiniz boş" text="Beğendiğiniz halıları sepete ekleyerek alışverişe başlayın." href="/urunler" cta="Alışverişe Başla" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <div>
              {error && (
                <p role="alert" className="mb-3 rounded-lg bg-brand-red/10 px-4 py-3 text-[14px] text-brand-red-deep">
                  {error}
                </p>
              )}
              <ul className="divide-y divide-line rounded-xl border border-line bg-white px-4 md:px-6">
                {items.map((item) => (
                  <CartLine key={item.id} item={item} />
                ))}
              </ul>
              <Link href="/urunler" className="mt-4 inline-block text-[14px] font-bold hover:underline">
                ← Alışverişe Devam Et
              </Link>
            </div>
            <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-6 shadow-card lg:sticky lg:top-40">
              <h2 className="text-lg font-bold">Sipariş Özeti</h2>
              <CartSummary cart={cart} />
              {blocked ? (
                <p className="text-[13px] font-semibold text-brand-red">Stoğu yetersiz ürünleri güncelleyin.</p>
              ) : (
                <Link href="/odeme" className="btn-primary w-full">
                  Siparişi Tamamla
                </Link>
              )}
              <p className="text-center text-[12px] text-muted">256-bit SSL ile güvenli ödeme</p>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
