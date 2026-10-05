import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { CatalogView, type SearchParams } from '@/components/catalog/CatalogView';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getCollection, orNull } from '@/lib/api';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await orNull(getCollection((await params).slug));
  return collection ? { title: collection.name, description: collection.description ?? undefined } : {};
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = await orNull(getCollection(slug));
  if (!collection) notFound();
  return (
    <>
      {collection.bannerUrl && (
        <div className="relative h-56 overflow-hidden md:h-72">
          <Image src={collection.bannerUrl} alt="" fill unoptimized priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 grid place-items-center bg-black/25 text-center">
            <div>
              <p className="label-eyebrow text-gold">Koleksiyon</p>
              <p className="font-serif text-4xl font-semibold text-white drop-shadow md:text-6xl">{collection.name}</p>
            </div>
          </div>
        </div>
      )}
      <Breadcrumb items={[{ label: 'Koleksiyonlar', href: '/koleksiyonlar' }, { label: collection.name }]} />
      <CatalogView
        title={collection.name}
        description={collection.description}
        basePath={`/koleksiyon/${slug}`}
        baseQuery={{ collection: slug }}
        searchParams={await searchParams}
      />
    </>
  );
}
