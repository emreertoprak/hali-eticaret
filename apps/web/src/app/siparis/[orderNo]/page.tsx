'use client';

import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderStatusBadge } from '@/components/ui/OrderCard';
import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/lib/types';

function OrderDetail() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const isNew = useSearchParams().get('yeni') === '1';
  const { authFetch } = useAuth();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    authFetch<Order>(`/orders/${orderNo}`).then(setOrder).catch(() => setOrder(null));
  }, [authFetch, orderNo]);

  if (order === undefined) return <p className="py-16 text-center text-muted">Yükleniyor…</p>;
  if (order === null) return <EmptyState title="Sipariş bulunamadı" href="/hesabim/siparisler" cta="Siparişlerim" />;
  const a = order.shippingAddress;

  return (
    <div className="space-y-6">
      {isNew && (
        <div className="flex items-start gap-3 rounded-xl bg-[#e3f3ea] p-5 text-[#14532d]">
          <CheckCircle2 className="shrink-0" />
          <div>
            <p className="font-bold">Siparişiniz alındı, teşekkür ederiz!</p>
            <p className="text-[14px]">
              {order.paymentMethod === 'bank_transfer'
                ? 'Havale/EFT açıklamasına sipariş numaranızı yazmayı unutmayın. IBAN: TR00 0000 0000 0000 0000 0000 00'
                : 'Ödemeniz onaylandı. Siparişiniz kısa sürede hazırlanacak.'}
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[30px] font-semibold">Sipariş #{order.orderNo}</h1>
          <p className="text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-line rounded-xl border border-line bg-white px-5">
          {order.items.map((i) => (
            <li key={i.sku} className="flex gap-4 py-4">
              <span className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded bg-cream">
                {i.imageUrl && <Image src={i.imageUrl} alt="" fill unoptimized sizes="64px" className="object-cover" />}
              </span>
              <div className="flex-1 text-[14px]">
                <Link href={`/urun/${i.slug}`} className="font-semibold hover:underline">
                  {i.name}
                </Link>
                <p className="text-muted">
                  {i.sizeLabel} · {i.quantity} × {formatPrice(i.unitPrice)}
                </p>
              </div>
              <p className="font-bold">{formatPrice(i.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-5 text-[14px]">
          <div>
            <p className="label-eyebrow mb-1 text-muted">Teslimat Adresi</p>
            <p className="font-semibold">{a.fullName}</p>
            <p className="text-muted">
              {a.addressLine}, {a.district}/{a.city} · {a.phone}
            </p>
          </div>
          <div>
            <p className="label-eyebrow mb-1 text-muted">Ödeme</p>
            <p>
              {order.paymentMethod === 'card' ? 'Kredi Kartı' : 'Havale / EFT'}
              {order.installmentCount > 1 ? ` · ${order.installmentCount} taksit` : ''}
            </p>
          </div>
          <dl className="space-y-1 border-t border-line pt-3">
            <div className="flex justify-between">
              <dt className="text-muted">Ara Toplam</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Kargo</dt>
              <dd>{order.shippingFee ? formatPrice(order.shippingFee) : 'Ücretsiz'}</dd>
            </div>
            <div className="flex justify-between text-[16px] font-extrabold">
              <dt>Toplam</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Siparişlerim', href: '/hesabim/siparisler' }, { label: 'Sipariş Detayı' }]} />
      <div className="container-page pb-16">
        <RequireAuth>
          <Suspense>
            <OrderDetail />
          </Suspense>
        </RequireAuth>
      </div>
    </>
  );
}
