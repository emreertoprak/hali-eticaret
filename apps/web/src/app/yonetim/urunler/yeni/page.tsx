'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { EMPTY_PRODUCT, ProductForm } from '@/components/admin/ProductForm';
import { PageHeader } from '@/components/admin/ui';

export default function NewProductPage() {
  return (
    <>
      <Link href="/yonetim/urunler" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft size={14} /> Ürünler
      </Link>
      <PageHeader title="Yeni Ürün" />
      <ProductForm initial={EMPTY_PRODUCT} />
    </>
  );
}
