'use client';

import { ArrowLeft, CreditCard, Truck, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Card, Field, Notice, PageHeader, useAdminData } from '@/components/admin/ui';
import { OrderStatusBadge } from '@/components/ui/OrderCard';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_STATUS_ACTIONS, type AdminOrderDetail, fieldErrors } from '@/lib/admin';
import { ApiError } from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';

const PAYMENT_STATUS: Record<string, string> = { pending: 'Bekliyor', paid: 'Ödendi', failed: 'Başarısız', refunded: 'İade edildi' };
const ATTEMPT_STATUS: Record<string, string> = { initiated: 'Başlatıldı', succeeded: 'Başarılı', failed: 'Başarısız' };
const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'Sürat Kargo', 'PTT Kargo', 'UPS', 'Kendi aracımız'];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authFetch } = useAuth();
  const { data: order, error, setData } = useAdminData<AdminOrderDetail>(`/admin/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const transition = async (status: string) => {
    if (status === 'cancelled' && !window.confirm('Sipariş iptal edilecek ve stoklar iade edilecek. Emin misiniz?')) return;
    setBusy(true);
    setMessage(null);
    setErrors({});
    try {
      const body = status === 'shipped' ? { status, carrier, trackingNumber: tracking.trim() || undefined } : { status };
      const next = await authFetch<AdminOrderDetail>(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) });
      setData(next);
      setMessage({ kind: 'success', text: 'Sipariş durumu güncellendi.' });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(fieldErrors(err.details));
        setMessage({ kind: 'error', text: err.message });
      }
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Notice>{error}</Notice>;
  if (!order) return <p className="py-16 text-center text-muted">Yükleniyor…</p>;
  const a = order.shippingAddress;

  return (
    <>
      <Link href="/yonetim/siparisler" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} /> Siparişler
      </Link>
      <PageHeader title={`Sipariş #${order.orderNo}`} description={formatDate(order.createdAt)} actions={<OrderStatusBadge status={order.status} />} />
      {message && (
        <Notice kind={message.kind} onClose={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Ürünler">
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.sku} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded bg-cream">
                    {i.imageUrl && <Image src={i.imageUrl} alt="" fill unoptimized sizes="56px" className="object-cover" />}
                  </span>
                  <div className="flex-1 text-[14px]">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-muted">
                      {i.sizeLabel} · {i.sku} · {i.quantity} × {formatPrice(i.unitPrice)}
                    </p>
                  </div>
                  <p className="font-bold tabular-nums">{formatPrice(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted">Ara toplam</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Kargo</dt>
                <dd className="tabular-nums">{order.shippingFee ? formatPrice(order.shippingFee) : 'Ücretsiz'}</dd>
              </div>
              <div className="flex justify-between text-[16px] font-extrabold">
                <dt>Toplam</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Ödeme denemeleri">
            {order.payments.length === 0 ? (
              <p className="text-[14px] text-muted">{order.paymentMethod === 'bank_transfer' ? 'Havale/EFT — ödeme onayı yöneticide.' : 'Henüz ödeme denemesi yok.'}</p>
            ) : (
              <ul className="divide-y divide-line text-[14px]">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span>
                      <span className="font-semibold">{p.merchantOid}</span>
                      <span className="ml-2 text-[12px] text-muted uppercase">{p.provider}</span>
                      <span className="block text-[12px] text-muted">{formatDate(p.createdAt)}</span>
                    </span>
                    <span className="text-right">
                      <span className={`font-bold ${p.status === 'succeeded' ? 'text-[#1d7a46]' : p.status === 'failed' ? 'text-brand-red' : ''}`}>{ATTEMPT_STATUS[p.status]}</span>
                      {p.installmentCount && p.installmentCount > 1 && <span className="block text-[12px]">{p.installmentCount} taksit</span>}
                      {p.failedReason && <span className="block text-[12px] text-muted">{p.failedReason}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="İşlemler">
            {order.allowedTransitions.length === 0 ? (
              <p className="text-[14px] text-muted">Bu sipariş için başka işlem yok.</p>
            ) : (
              <div className="space-y-3">
                {order.allowedTransitions.includes('shipped') && (
                  <div className="space-y-3 rounded-lg bg-cream p-3">
                    <Field label="Kargo firması">
                      <select className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                        {CARRIERS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Takip numarası" error={errors.trackingNumber}>
                      <input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} />
                    </Field>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {order.allowedTransitions.map((status) => (
                    <button
                      key={status}
                      disabled={busy}
                      onClick={() => void transition(status)}
                      className={status === 'cancelled' ? 'btn-outline border-brand-red! px-5! py-2! text-brand-red! hover:bg-brand-red! hover:text-white!' : 'btn-primary px-5! py-2!'}
                    >
                      {ADMIN_STATUS_ACTIONS[status] ?? status}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Müşteri" actions={<User size={16} />}>
            {order.customer && (
              <div className="text-[14px]">
                <p className="font-semibold">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p className="text-muted">{order.customer.email}</p>
                {order.customer.phone && <p className="text-muted">{order.customer.phone}</p>}
                <p className="mt-1 text-[12px] text-muted">Üyelik: {formatDate(order.customer.memberSince)}</p>
              </div>
            )}
          </Card>

          <Card title="Teslimat" actions={<Truck size={16} />}>
            <div className="space-y-2 text-[14px]">
              <p className="font-semibold">{a.fullName}</p>
              <p className="text-muted">
                {a.addressLine}, {a.district}/{a.city}
              </p>
              <p className="text-muted">{a.phone}</p>
              {order.trackingNumber && (
                <p className="rounded-lg bg-cream px-3 py-2">
                  {order.carrier} · <strong>{order.trackingNumber}</strong>
                </p>
              )}
              {order.note && <p className="rounded-lg bg-gold/20 px-3 py-2">Not: {order.note}</p>}
            </div>
          </Card>

          <Card title="Ödeme" actions={<CreditCard size={16} />}>
            <dl className="space-y-1 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted">Yöntem</dt>
                <dd>{order.paymentMethod === 'card' ? 'Kredi kartı' : 'Havale / EFT'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Durum</dt>
                <dd className="font-semibold">{PAYMENT_STATUS[order.paymentStatus]}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Taksit</dt>
                <dd>{order.installmentCount > 1 ? `${order.installmentCount} taksit` : 'Tek çekim'}</dd>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-muted">Ödeme zamanı</dt>
                  <dd>{formatDate(order.paidAt)}</dd>
                </div>
              )}
            </dl>
            {order.status === 'cancelled' && order.paymentStatus === 'paid' && (
              <p className="mt-3 rounded-lg bg-brand-red/10 px-3 py-2 text-[13px] font-semibold text-brand-red-deep">İptal edilmiş siparişte ödeme alınmış — PayTR panelinden iade gerekli.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
