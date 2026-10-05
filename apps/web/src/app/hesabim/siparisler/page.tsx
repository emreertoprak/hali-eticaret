'use client';

import { useEffect, useState } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderCard } from '@/components/ui/OrderCard';
import { RequireAuth } from '@/components/ui/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import type { Order, Paginated } from '@/lib/types';

function Orders() {
  const { authFetch } = useAuth();
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    authFetch<Paginated<Order>>(`/orders?page=${page}&limit=10`).then(setData).catch(() => setData(null));
  }, [authFetch, page]);

  if (!data) return <p className="py-16 text-center text-muted">Siparişler yükleniyor…</p>;
  if (!data.items.length) return <EmptyState title="Henüz siparişiniz yok" href="/urunler" cta="Alışverişe Başla" />;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {data.items.map((o) => (
          <OrderCard key={o.orderNo} order={o} />
        ))}
      </div>
      {data.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-3">
          <button className="btn-outline px-5! py-2!" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Önceki
          </button>
          <button className="btn-outline px-5! py-2!" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Sonraki
          </button>
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Hesabım', href: '/hesabim' }, { label: 'Siparişlerim' }]} />
      <div className="container-page pb-16">
        <h1 className="mb-6 font-serif text-[34px] font-semibold">Siparişlerim</h1>
        <RequireAuth>
          <Orders />
        </RequireAuth>
      </div>
    </>
  );
}
