import type { Metadata } from 'next';

import { CatalogView, type SearchParams } from '@/components/catalog/CatalogView';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Tüm Halılar' };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <>
      <Breadcrumb items={[{ label: 'Tüm Ürünler' }]} />
      <CatalogView title="Tüm Halılar" basePath="/urunler" baseQuery={{}} searchParams={await searchParams} />
    </>
  );
}
