import Image from 'next/image';
import Link from 'next/link';

import type { Collection } from '@/lib/types';

export function CollectionTiles({ collections }: { collections: Collection[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3 md:gap-6">
      {collections.map((c) => (
        <Link key={c.id} href={`/koleksiyon/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-charcoal md:aspect-[9/11]">
          {c.imageUrl && (
            <Image src={c.imageUrl} alt="" fill unoptimized sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <p className="label-eyebrow text-gold">Koleksiyon</p>
            <h3 className="mt-1 font-serif text-[26px] leading-tight font-semibold md:text-[30px]">{c.name}</h3>
            {c.description && <p className="mt-1 text-[14px] text-white/80">{c.description}</p>}
            <span className="mt-4 inline-block rounded-full border border-white/70 px-5 py-2 text-[13px] font-bold transition group-hover:bg-white group-hover:text-ink">
              Keşfet
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
