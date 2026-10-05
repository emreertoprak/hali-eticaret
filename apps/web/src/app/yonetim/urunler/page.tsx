'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { ActiveBadge, DataTable, Notice, PageHeader, Pager, useAdminData } from '@/components/admin/ui';
import type { AdminPage, AdminProductRow } from '@/lib/admin';
import { formatPrice } from '@/lib/format';

function Products() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(q);
  const query = new URLSearchParams({ page: String(page), limit: '20', ...(q ? { q } : {}) });
  const { data, error } = useAdminData<AdminPage<AdminProductRow>>(`/admin/products?${query}`);

  return (
    <>
      <PageHeader
        title="Ürünler"
        description="Ürün, ebat varyantı, stok ve görsel yönetimi"
        actions={
          <Link href="/yonetim/urunler/yeni" className="btn-primary px-5! py-2.5!">
            <Plus size={16} /> Yeni Ürün
          </Link>
        }
      />
      <form
        className="relative mb-4 w-full sm:w-80"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`${pathname}?${new URLSearchParams(search.trim() ? { q: search.trim() } : {})}`);
        }}
      >
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün adı veya kod" aria-label="Ürün ara" className="input rounded-full! py-2! pl-10" />
      </form>
      {error && <Notice>{error}</Notice>}
      {!data ? (
        <p className="py-16 text-center text-muted">Yükleniyor…</p>
      ) : (
        <>
          <DataTable
            rows={data.items}
            rowKey={(p) => p.id}
            onRowClick={(p) => router.push(`/yonetim/urunler/${p.id}`)}
            columns={[
              {
                key: 'product',
                header: 'Ürün',
                render: (p) => (
                  <span className="flex items-center gap-3">
                    <span className="size-12 shrink-0 overflow-hidden rounded bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.imageUrl && <img src={p.imageUrl} alt="" className="size-full object-cover" />}
                    </span>
                    <span>
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-[12px] text-muted">{p.skuBase}</span>
                    </span>
                  </span>
                ),
              },
              { key: 'category', header: 'Kategori', render: (p) => p.categoryName },
              {
                key: 'price',
                header: 'Fiyat',
                render: (p) => <span className="tabular-nums">{p.minPrice === p.maxPrice ? formatPrice(p.minPrice) : `${formatPrice(p.minPrice)} – ${formatPrice(p.maxPrice)}`}</span>,
              },
              {
                key: 'stock',
                header: 'Stok',
                className: 'text-right',
                render: (p) => (
                  <span className={`font-bold tabular-nums ${p.totalStock === 0 ? 'text-brand-red' : ''}`}>
                    {p.totalStock}
                    <span className="ml-1 text-[12px] font-normal text-muted">/ {p.variantCount} ebat</span>
                  </span>
                ),
              },
              { key: 'active', header: 'Durum', render: (p) => <ActiveBadge active={p.isActive} /> },
            ]}
          />
          <Pager
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPage={(p) => router.push(`${pathname}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`)}
          />
        </>
      )}
    </>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense>
      <Products />
    </Suspense>
  );
}
