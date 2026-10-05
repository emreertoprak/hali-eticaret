'use client';

import { AlertTriangle, Clock, CreditCard, Package, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { RevenueChart } from '@/components/admin/RevenueChart';
import { Card, Notice, PageHeader, useAdminData } from '@/components/admin/ui';
import { OrderStatusBadge } from '@/components/ui/OrderCard';
import type { AdminStats } from '@/lib/admin';
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/format';

const RANGES = [7, 30, 90];

function Tile({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: typeof Clock }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-card">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <Icon size={15} /> {label}
      </p>
      <p className="mt-2 text-[24px] font-extrabold tabular-nums">{value}</p>
      {sub && <p className="text-[12px] text-muted">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const { data, error } = useAdminData<AdminStats>(`/admin/stats?days=${days}`);

  return (
    <>
      <PageHeader
        title="Panel"
        description="Satış ve stok özeti"
        actions={
          <div className="flex rounded-full border border-line bg-white p-1" role="group" aria-label="Dönem">
            {RANGES.map((d) => (
              <button
                key={d}
                aria-pressed={days === d}
                onClick={() => setDays(d)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${days === d ? 'bg-charcoal text-white' : 'text-muted'}`}
              >
                {d} gün
              </button>
            ))}
          </div>
        }
      />
      {error && <Notice>{error}</Notice>}
      {!data ? (
        <p className="py-16 text-center text-muted">Yükleniyor…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_2fr]">
            <div className="rounded-xl border border-line bg-charcoal p-6 text-white shadow-card">
              <p className="text-[13px] font-semibold text-white/70">Son {data.days} gün ciro</p>
              <p className="mt-2 text-[44px] leading-none font-extrabold tabular-nums md:text-[52px]">{formatPrice(data.revenue.period.revenue)}</p>
              <p className="mt-3 text-[13px] text-white/70">
                {data.revenue.period.orders} ödenmiş sipariş · ortalama {formatPrice(data.averageOrderValue)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Tile icon={Clock} label="Bugün" value={formatPrice(data.revenue.today.revenue)} sub={`${data.revenue.today.orders} sipariş`} />
              <Tile icon={Clock} label="Son 7 gün" value={formatPrice(data.revenue.last7Days.revenue)} sub={`${data.revenue.last7Days.orders} sipariş`} />
              <Tile icon={CreditCard} label="Ödeme bekleyen" value={String(data.pendingPayment.count)} sub={formatPrice(data.pendingPayment.total)} />
              <Tile icon={Users} label="Müşteri / aktif ürün" value={`${data.customers} / ${data.activeProducts}`} />
            </div>
          </div>

          <Card title={`Günlük ciro — son ${data.days} gün`}>
            <RevenueChart series={data.series} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Sipariş durumları">
              <ul className="space-y-2.5">
                {Object.keys(ORDER_STATUS_LABELS).map((status) => (
                  <li key={status} className="flex items-center justify-between">
                    <Link href={`/yonetim/siparisler?status=${status}`} className="hover:underline">
                      <OrderStatusBadge status={status} />
                    </Link>
                    <span className="font-bold tabular-nums">{data.ordersByStatus[status as keyof typeof data.ordersByStatus] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="En çok satanlar">
              {data.topProducts.length === 0 ? (
                <p className="text-[14px] text-muted">Bu dönemde satış yok.</p>
              ) : (
                <ol className="space-y-3 text-[14px]">
                  {data.topProducts.map((p, i) => (
                    <li key={`${p.productId}-${i}`} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="mr-2 font-bold text-muted">{i + 1}.</span>
                        <Link href={`/urun/${p.slug}`} target="_blank" className="font-semibold hover:underline">
                          {p.name}
                        </Link>
                        <span className="block pl-5 text-[12px] text-muted">{p.quantity} adet</span>
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">{formatPrice(p.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card title="Düşük stok" actions={<AlertTriangle size={16} className="text-brand-red" aria-label="Uyarı" />}>
              {data.lowStock.length === 0 ? (
                <p className="text-[14px] text-muted">Tüm ebatlarda stok yeterli.</p>
              ) : (
                <ul className="space-y-2.5 text-[14px]">
                  {data.lowStock.map((v) => (
                    <li key={v.variantId} className="flex items-center justify-between gap-3">
                      <Link href={`/yonetim/urunler/${v.productId}`} className="min-w-0 hover:underline">
                        <span className="block truncate font-semibold">{v.name}</span>
                        <span className="text-[12px] text-muted">
                          {v.sizeLabel} · {v.sku}
                        </span>
                      </Link>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-bold ${v.stock === 0 ? 'bg-brand-red/10 text-brand-red-deep' : 'bg-gold/30'}`}>
                        {v.stock === 0 ? 'Tükendi' : `${v.stock} adet`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Son siparişler" actions={<Link href="/yonetim/siparisler" className="text-[13px] font-bold hover:underline">Tümü →</Link>}>
            <ul className="divide-y divide-line text-[14px]">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/yonetim/siparisler/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-sand">
                    <span className="flex items-center gap-2 font-bold">
                      <Package size={15} /> #{o.orderNo}
                    </span>
                    <span className="text-muted">{o.email}</span>
                    <span className="text-muted">{formatDate(o.createdAt)}</span>
                    <OrderStatusBadge status={o.status} />
                    <span className="font-bold tabular-nums">{formatPrice(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
