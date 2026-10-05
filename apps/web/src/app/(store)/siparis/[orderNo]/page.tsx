'use client';

import { AlertTriangle, CheckCircle2, Loader2, Truck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderStatusBadge } from '@/components/ui/OrderCard';
import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { formatDate, formatPrice } from '@/lib/format';
import { paymentUrlKey, sessionStore } from '@/lib/storage';
import type { Order } from '@/lib/types';

const POLL_INTERVAL_MS = 2000;
const POLL_LIMIT = 15;

function OrderDetail() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const params = useSearchParams();
  const isNew = params.get('yeni') === '1';
  const paymentResult = params.get('odeme'); // PayTR dönüşü: "tamam" | "hata"
  const { authFetch } = useAuth();
  const { reload: reloadCart } = useCart();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [polls, setPolls] = useState(0);

  // PayTR dönüş sayfası iframe içinde açılırsa üst pencereye taşı.
  useEffect(() => {
    if (window.top && window.top !== window.self) window.top.location.href = window.location.href;
  }, []);

  useEffect(() => {
    if (paymentResult) sessionStore.set(paymentUrlKey(orderNo), null);
    authFetch<Order>(`/orders/${orderNo}`).then(setOrder).catch(() => setOrder(null));
  }, [authFetch, orderNo, paymentResult]);

  // Ödeme bildirimi PayTR'den sunucuya birkaç saniye gecikmeli gelebilir: onaylanana kadar yokla.
  const verifying = paymentResult === 'tamam' && order?.status === 'pending_payment' && polls < POLL_LIMIT;
  useEffect(() => {
    if (!verifying) return;
    const id = setTimeout(() => {
      authFetch<Order>(`/orders/${orderNo}`)
        .then((next) => {
          setOrder(next);
          if (next.paymentStatus === 'paid') void reloadCart();
        })
        .finally(() => setPolls((n) => n + 1));
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [verifying, polls, authFetch, orderNo, reloadCart]);

  if (order === undefined) return <p className="py-16 text-center text-muted">Yükleniyor…</p>;
  if (order === null) return <EmptyState title="Sipariş bulunamadı" href="/hesabim/siparisler" cta="Siparişlerim" />;
  const a = order.shippingAddress;
  const awaitingCard =
    order.paymentMethod === 'card' &&
    order.status === 'pending_payment' &&
    (!order.paymentExpiresAt || new Date(order.paymentExpiresAt).getTime() > Date.now());

  return (
    <div className="space-y-6">
      {verifying && (
        <div className="flex items-center gap-3 rounded-xl bg-cream p-5">
          <Loader2 className="shrink-0 animate-spin" />
          <p className="font-semibold">Ödemeniz doğrulanıyor, lütfen bekleyin…</p>
        </div>
      )}
      {(isNew || paymentResult === 'tamam') && order.paymentStatus === 'paid' && (
        <div className="flex items-start gap-3 rounded-xl bg-[#e3f3ea] p-5 text-[#14532d]">
          <CheckCircle2 className="shrink-0" />
          <div>
            <p className="font-bold">Siparişiniz alındı, teşekkür ederiz!</p>
            <p className="text-[14px]">Ödemeniz onaylandı. Siparişiniz kısa sürede hazırlanacak.</p>
          </div>
        </div>
      )}
      {isNew && order.paymentMethod === 'bank_transfer' && order.status === 'pending_payment' && (
        <div className="flex items-start gap-3 rounded-xl bg-[#e3f3ea] p-5 text-[#14532d]">
          <CheckCircle2 className="shrink-0" />
          <div>
            <p className="font-bold">Siparişiniz alındı, teşekkür ederiz!</p>
            <p className="text-[14px]">Havale/EFT açıklamasına sipariş numaranızı yazmayı unutmayın. IBAN: TR00 0000 0000 0000 0000 0000 00</p>
          </div>
        </div>
      )}
      {awaitingCard && !verifying && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gold/20 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="shrink-0" />
            <div>
              <p className="font-bold">{paymentResult === 'hata' ? 'Ödeme tamamlanamadı' : 'Ödeme bekleniyor'}</p>
              <p className="text-[14px]">
                {paymentResult === 'hata' ? 'Kartınızdan ücret alınmadı. ' : ''}
                {order.paymentExpiresAt ? `Ödemeyi ${formatDate(order.paymentExpiresAt)} saatine kadar tamamlayabilirsiniz.` : ''}
              </p>
            </div>
          </div>
          <Link href={`/odeme/guvenli/${order.orderNo}`} className="btn-primary">
            Ödemeyi Tamamla
          </Link>
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
          {order.trackingNumber && (
            <div>
              <p className="label-eyebrow mb-1 text-muted">Kargo</p>
              <p className="flex items-center gap-2 font-semibold">
                <Truck size={16} /> {order.carrier}
              </p>
              <p className="text-muted">Takip no: {order.trackingNumber}</p>
            </div>
          )}
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
