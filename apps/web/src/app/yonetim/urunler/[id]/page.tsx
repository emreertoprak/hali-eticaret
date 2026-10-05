'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ProductForm, toFormProduct } from '@/components/admin/ProductForm';
import { Notice, PageHeader, useAdminData } from '@/components/admin/ui';
import type { AdminProductResponse } from '@/lib/admin';

function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const justCreated = useSearchParams().get('kaydedildi') === '1';
  const { data, error } = useAdminData<AdminProductResponse>(`/admin/products/${id}`);
  return (
    <>
      <Link href="/yonetim/urunler" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} /> Ürünler
      </Link>
      <PageHeader title={data ? data.name : 'Ürün'} />
      {justCreated && <Notice kind="success">Ürün oluşturuldu.</Notice>}
      {error && <Notice>{error}</Notice>}
      {data ? <ProductForm key={String(data.id)} initial={toFormProduct(data)} /> : !error && <p className="py-16 text-center text-muted">Yükleniyor…</p>}
    </>
  );
}

export default function EditProductPage() {
  return (
    <Suspense>
      <EditProduct />
    </Suspense>
  );
}
