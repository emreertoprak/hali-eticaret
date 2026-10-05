import type { Metadata } from 'next';

import { CatalogView, type SearchParams } from '@/components/catalog/CatalogView';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export const metadata: Metadata = { title: 'Arama', robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  return (
    <>
      <Breadcrumb items={[{ label: 'Arama' }]} />
      <CatalogView title={q ? `“${q}” için sonuçlar` : 'Arama'} basePath="/arama" baseQuery={{}} searchParams={params} />
    </>
  );
}
