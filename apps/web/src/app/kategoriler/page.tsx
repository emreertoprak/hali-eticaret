import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getCategories } from '@/lib/api';

export const metadata: Metadata = { title: 'Kategoriler' };

export default async function CategoriesPage() {
  // API'ye ulaşılamazsa (ör. build sırasında) boş liste; ISR ile yenilenir.
  const categories = await getCategories().catch(() => []);
  return (
    <>
      <Breadcrumb items={[{ label: 'Kategoriler' }]} />
      <div className="container-page pb-16">
        <h1 className="mb-8 font-serif text-[34px] font-semibold md:text-[40px]">Kategoriler</h1>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/kategori/${c.slug}`} className="group flex items-center gap-3 rounded-xl border border-line bg-white p-3 shadow-card transition hover:shadow-card-hover">
                <span className="story-ring shrink-0 rounded-full p-[2.5px]">
                  <span className="relative block size-14 overflow-hidden rounded-full border-2 border-cream">
                    {c.imageUrl && <Image src={c.imageUrl} alt="" fill unoptimized sizes="56px" className="object-cover" />}
                  </span>
                </span>
                <span>
                  <span className="block font-semibold group-hover:underline">{c.name}</span>
                  <span className="text-[12px] text-muted">{c.productCount ?? 0} ürün</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
