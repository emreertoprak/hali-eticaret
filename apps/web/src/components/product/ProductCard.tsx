'use client';

import Image from 'next/image';
import Link from 'next/link';

import type { ProductListItem } from '@/lib/types';

import { Price } from '../ui/Price';

export function ProductCard({ product, priority = false }: { product: ProductListItem; priority?: boolean }) {
  const href = `/urun/${product.slug}`;
  const sizes = product.sizes.slice(0, 3);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover">
      <Link href={href} className="relative block aspect-[3/4] overflow-hidden bg-cream" aria-label={product.name}>
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            priority={priority}
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
        {product.hoverImageUrl && (
          <Image
            src={product.hoverImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized
            className="object-cover opacity-0 transition duration-500 group-hover:opacity-100"
          />
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.discountRate ? (
            <span className="rounded-full bg-brand-red px-2.5 py-1 text-[11px] font-extrabold text-white">%{product.discountRate}</span>
          ) : null}
          {!product.inStock && <span className="rounded-full bg-charcoal px-2.5 py-1 text-[11px] font-bold text-white">Tükendi</span>}
        </div>
        {product.isFeatured && (
          <span className="label-eyebrow absolute top-2 right-2 rounded-full bg-cream px-2.5 py-1 text-ink">Öne Çıkan</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3 md:p-4">
        <p className="label-eyebrow text-muted">{product.category.name}</p>
        <h3 className="line-clamp-2 text-[14px] leading-snug font-semibold md:text-[15px]">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto">
          <Price price={product.price} oldPrice={product.oldPrice} size="sm" />
        </div>
        {sizes.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Ebatlar">
            {sizes.map((s) => (
              <li key={s} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                {s}
              </li>
            ))}
            {product.sizes.length > sizes.length && (
              <li className="px-1 py-0.5 text-[11px] text-muted">+{product.sizes.length - sizes.length}</li>
            )}
          </ul>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ products, columns = 4 }: { products: ProductListItem[]; columns?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:gap-6 ${columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
