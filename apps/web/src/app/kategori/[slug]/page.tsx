import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CatalogView, type SearchParams } from '@/components/catalog/CatalogView';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getCategory, orNull } from '@/lib/api';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await orNull(getCategory((await params).slug));
  return category ? { title: category.name, description: category.description ?? undefined } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await orNull(getCategory(slug));
  if (!category) notFound();
  return (
    <>
      <Breadcrumb items={[{ label: 'Kategoriler', href: '/kategoriler' }, { label: category.name }]} />
      <CatalogView
        title={category.name}
        description={category.description}
        basePath={`/kategori/${slug}`}
        baseQuery={{ category: slug }}
        searchParams={await searchParams}
      />
    </>
  );
}
