'use client';

import Image from 'next/image';
import { useState } from 'react';

export function ProductGallery({ images, name }: { images: { url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      <ul className="no-scrollbar flex gap-2 overflow-x-auto md:w-20 md:flex-col" aria-label="Görseller">
        {images.map((img, i) => (
          <li key={img.url}>
            <button
              onClick={() => setActive(i)}
              aria-label={`${i + 1}. görseli göster`}
              aria-current={i === active}
              className={`relative block aspect-[3/4] w-16 overflow-hidden rounded-lg border-2 bg-cream md:w-20 ${i === active ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}
            >
              <Image src={img.url} alt="" fill unoptimized sizes="80px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <div className="group relative aspect-[3/4] flex-1 overflow-hidden rounded-xl bg-cream">
        {current && (
          <Image
            src={current.url}
            alt={current.alt ?? name}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        )}
      </div>
    </div>
  );
}
