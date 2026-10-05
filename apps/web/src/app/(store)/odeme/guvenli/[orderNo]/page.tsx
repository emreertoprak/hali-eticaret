'use client';

import { Lock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { paymentUrlKey, sessionStore } from '@/lib/storage';
import type { Order, PaymentStart } from '@/lib/types';

declare global {
  interface Window {
    iFrameResize?: (options: Record<string, unknown>, selector: string) => void;
  }
}

function useCountdown(until: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

function SecurePayment() {
  const { orderNo } = useParams<{ orderNo: string }>();
  const { authFetch } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const left = useCountdown(order?.paymentExpiresAt ?? null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const current = await authFetch<Order>(`/orders/${orderNo}`);
      setOrder(current);
      if (current.status !== 'pending_payment' || current.paymentMethod !== 'card') return;
      const cached = sessionStore.get(paymentUrlKey(orderNo));
      if (cached) {
        setIframeUrl(cached);
        return;
      }
      const payment = await authFetch<PaymentStart>(`/orders/${orderNo}/payment`, { method: 'POST' });
      if (payment.iframeUrl) {
        sessionStore.set(paymentUrlKey(orderNo), payment.iframeUrl);
        setIframeUrl(payment.iframeUrl);
      } else {
        window.location.href = `/siparis/${orderNo}?odeme=tamam`;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ödeme sayfası yüklenemedi.');
    }
  }, [authFetch, orderNo]);

  useEffect(() => {
    void start();
  }, [start]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-2xl">Ödeme başlatılamadı</p>
        <p className="mt-2 text-muted">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn-primary" onClick={() => void start()}>
            Tekrar Dene
          </button>
          <Link href={`/siparis/${orderNo}`} className="btn-outline">
            Siparişe Git
          </Link>
        </div>
      </div>
    );
  }
  if (!order) return <p className="py-16 text-center text-muted">Ödeme sayfası hazırlanıyor…</p>;
  if (order.status !== 'pending_payment') {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-serif text-2xl">Bu sipariş için ödeme beklenmiyor</p>
        <Link href={`/siparis/${orderNo}`} className="btn-primary mt-6">
          Siparişi Görüntüle
        </Link>
      </div>
    );
  }

  const minutes = left === null ? null : Math.floor(left / 60000);
  const seconds = left === null ? null : Math.floor((left % 60000) / 1000);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <section className="min-h-[520px] overflow-hidden rounded-xl border border-line bg-white p-2 md:p-4">
        {iframeUrl ? (
          <>
            <Script src="https://www.paytr.com/js/iframeResizer.min.js" strategy="afterInteractive" onLoad={() => window.iFrameResize?.({}, '#paytriframe')} />
            <iframe id="paytriframe" title="PayTR güvenli ödeme" src={iframeUrl} className="min-h-[600px] w-full border-0" scrolling="no" />
          </>
        ) : (
          <p className="py-24 text-center text-muted">Güvenli ödeme formu yükleniyor…</p>
        )}
      </section>
      <aside className="h-fit space-y-4 rounded-xl border border-line bg-white p-6 shadow-card">
        <p className="flex items-center gap-2 font-bold">
          <ShieldCheck size={18} /> PayTR Güvenli Ödeme
        </p>
        <dl className="space-y-1 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Sipariş</dt>
            <dd className="font-semibold">#{order.orderNo}</dd>
          </div>
          <div className="flex justify-between text-[17px]">
            <dt className="font-bold">Ödenecek</dt>
            <dd className="font-extrabold">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        {minutes !== null && (
          <p className={`rounded-lg px-3 py-2 text-[13px] ${left === 0 ? 'bg-brand-red/10 text-brand-red-deep' : 'bg-cream'}`}>
            {left === 0 ? 'Ödeme süresi doldu. Sipariş iptal edilecek.' : `Ödemeyi ${minutes}:${String(seconds).padStart(2, '0')} içinde tamamlayın; süre sonunda stok rezervasyonu kaldırılır.`}
          </p>
        )}
        <p className="flex items-start gap-2 text-[12px] text-muted">
          <Lock size={14} className="mt-0.5 shrink-0" /> Kart bilgileriniz doğrudan PayTR&apos;ye iletilir, sitemizde saklanmaz. Taksit seçeneklerini ödeme formunda görebilirsiniz.
        </p>
      </aside>
    </div>
  );
}

export default function SecurePaymentPage() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Ödeme', href: '/odeme' }, { label: 'Güvenli Ödeme' }]} />
      <div className="container-page pb-16">
        <h1 className="mb-6 font-serif text-[30px] font-semibold md:text-[34px]">Kart ile Ödeme</h1>
        <RequireAuth>
          <SecurePayment />
        </RequireAuth>
      </div>
    </>
  );
}
