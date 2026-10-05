import { Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Category } from '@/lib/types';

/** Instagram story tarzı kategori halkaları; mobilde yatay kaydırılır. */
export function CategoryStories({ categories }: { categories: Category[] }) {
  return (
    <section aria-label="Kategoriler" className="container-page">
      <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:gap-2 md:px-0 2xl:justify-between">
        {categories.map((c) => (
          <li key={c.id} className="w-[68px] shrink-0 snap-start md:w-[76px]">
            <Link href={`/kategori/${c.slug}`} className="group flex flex-col items-center gap-1.5 text-center">
              <span className="story-ring rounded-full p-[2.5px] transition group-hover:scale-105">
                <span className="block rounded-full border-2 border-cream bg-cream">
                  <span className="relative block size-[56px] overflow-hidden rounded-full md:size-[66px]">
                    {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="72px" unoptimized className="object-cover" />}
                  </span>
                </span>
              </span>
              <span className="line-clamp-2 text-[12px] leading-tight text-ink/85 group-hover:text-ink md:text-[13px]">{c.name}</span>
            </Link>
          </li>
        ))}
        <li className="w-[68px] shrink-0 snap-start md:w-[76px]">
          <Link href="/kategoriler" className="group flex flex-col items-center gap-1.5 text-center">
            <span className="grid size-[64px] place-items-center rounded-full border border-line bg-white text-ink/60 transition group-hover:border-ink group-hover:text-ink md:size-[74px]">
              <Plus size={20} />
            </span>
            <span className="text-[12px] leading-tight text-ink/85 md:text-[13px]">Tümünü Gör</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
