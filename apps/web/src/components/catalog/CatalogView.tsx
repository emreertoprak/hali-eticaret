import { Suspense } from 'react';

import { getProducts, type ProductQuery } from '@/lib/api';

import { ProductGrid } from '../product/ProductCard';
import { EmptyState } from '../ui/EmptyState';
import { FilterSidebar } from './FilterSidebar';
import { Pagination } from './Pagination';
import { SortSelect } from './SortSelect';

export type SearchParams = Record<string, string | string[] | undefined>;

const PASSTHROUGH = ['size', 'minPrice', 'maxPrice', 'sort', 'page', 'q'] as const;

export function pickQuery(searchParams: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PASSTHROUGH) {
    const v = searchParams[key];
    if (typeof v === 'string' && v) out[key] = v;
  }
  return out;
}

/** Kategori, koleksiyon, arama ve tüm ürünler sayfalarının ortak listeleme görünümü. */
export async function CatalogView({
  title,
  description,
  basePath,
  baseQuery,
  searchParams,
}: {
  title: string;
  description?: string | null;
  basePath: string;
  baseQuery: ProductQuery;
  searchParams: SearchParams;
}) {
  const userQuery = pickQuery(searchParams);
  const data = await getProducts({ ...baseQuery, ...userQuery, limit: '24' });
  const linkParams = { ...userQuery };
  delete linkParams.page;

  return (
    <div className="container-page pb-16">
      <header className="mb-6 border-b border-line pb-6">
        <h1 className="font-serif text-[30px] leading-tight font-semibold md:text-[40px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </header>
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-10">
        <Suspense>
          <FilterSidebar key={`${basePath}?${new URLSearchParams(linkParams)}`} facets={data.facets} />
        </Suspense>
        <div className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[14px] text-muted">
              <strong className="text-ink">{data.total}</strong> ürün
            </p>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>
          {data.items.length ? (
            <ProductGrid products={data.items} columns={3} />
          ) : (
            <EmptyState title="Ürün bulunamadı" text="Filtreleri değiştirerek tekrar deneyin." href={basePath} cta="Filtreleri Temizle" />
          )}
          <Pagination page={data.page} totalPages={data.totalPages} basePath={basePath} params={linkParams} />
        </div>
      </div>
    </div>
  );
}
