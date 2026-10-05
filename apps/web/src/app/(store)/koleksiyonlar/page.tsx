import type { Metadata } from 'next';

import { CollectionTiles } from '@/components/home/CollectionTiles';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getCollections } from '@/lib/api';

export const metadata: Metadata = { title: 'Koleksiyonlar' };

export default async function CollectionsPage() {
  // API'ye ulaşılamazsa (ör. build sırasında) boş liste; ISR ile yenilenir.
  const collections = await getCollections().catch(() => []);
  return (
    <>
      <Breadcrumb items={[{ label: 'Koleksiyonlar' }]} />
      <div className="container-page pb-16">
        <h1 className="mb-8 font-serif text-[34px] font-semibold md:text-[40px]">Koleksiyonlar</h1>
        <CollectionTiles collections={collections} />
      </div>
    </>
  );
}
