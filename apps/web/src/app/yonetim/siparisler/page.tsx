'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { DataTable, Notice, PageHeader, Pager, useAdminData } from '@/components/admin/ui';
import { OrderStatusBadge } from '@/components/ui/OrderCard';
import type { AdminOrderRow, AdminPage } from '@/lib/admin';
import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/format';

function Orders() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(q);

  const query = new URLSearchParams({ page: String(page), limit: '20', ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const { data, error } = useAdminData<AdminPage<AdminOrderRow>>(`/admin/orders?${query}`);

  const setParam = (next: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    router.push(`${pathname}?${p}`);
  };

  return (
    <>
      <PageHeader title="Siparişler" description="Durum filtresi, arama ve sipariş işlemleri" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
          {[['', 'Tümü'], ...Object.entries(ORDER_STATUS_LABELS)].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setParam({ status: value })}
              aria-pressed={status === value}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${status === value ? 'bg-charcoal text-white' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <form
          className="relative ml-auto w-full sm:w-72"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: search.trim() });
          }}
        >
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sipariş no veya e-posta" aria-label="Sipariş ara" className="input rounded-full! py-2! pl-10" />
        </form>
      </div>
      {error && <Notice>{error}</Notice>}
      {!data ? (
        <p className="py-16 text-center text-muted">Yükleniyor…</p>
      ) : (
        <>
          <DataTable
            rows={data.items}
            rowKey={(o) => o.id}
            onRowClick={(o) => router.push(`/yonetim/siparisler/${o.id}`)}
            columns={[
              { key: 'no', header: 'Sipariş', render: (o) => <span className="font-bold">#{o.orderNo}</span> },
              {
                key: 'customer',
                header: 'Müşteri',
                render: (o) => (
                  <span>
                    <span className="block font-semibold">{o.customer.name}</span>
                    <span className="text-[12px] text-muted">{o.customer.email}</span>
                  </span>
                ),
              },
              { key: 'date', header: 'Tarih', render: (o) => <span className="text-muted">{formatDate(o.createdAt)}</span> },
              { key: 'method', header: 'Ödeme', render: (o) => (o.paymentMethod === 'card' ? 'Kart' : 'Havale') },
              { key: 'status', header: 'Durum', render: (o) => <OrderStatusBadge status={o.status} /> },
              { key: 'total', header: 'Tutar', className: 'text-right', render: (o) => <span className="font-bold tabular-nums">{formatPrice(o.total)}</span> },
            ]}
          />
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={(p) => setParam({ page: String(p) })} />
        </>
      )}
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}
