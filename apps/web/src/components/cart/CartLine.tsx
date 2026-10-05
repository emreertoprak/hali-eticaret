'use client';

import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';
import type { CartItem } from '@/lib/types';

import { QuantityStepper } from '../ui/QuantityStepper';

export function CartLine({ item, compact = false }: { item: CartItem; compact?: boolean }) {
  const { updateItem, removeItem, loading } = useCart();
  const ignore = () => undefined;
  return (
    <li className="flex gap-3 py-4 md:gap-4">
      <Link href={`/urun/${item.slug}`} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg bg-cream md:w-24">
        {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill unoptimized sizes="96px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex justify-between gap-2">
          <Link href={`/urun/${item.slug}`} className="line-clamp-2 text-[14px] leading-snug font-semibold hover:underline">
            {item.name}
          </Link>
          <button aria-label={`${item.name} ürününü sepetten çıkar`} disabled={loading} onClick={() => removeItem(item.id).catch(ignore)} className="h-fit p-1 text-muted hover:text-brand-red">
            <Trash2 size={16} />
          </button>
        </div>
        <p className="text-[13px] text-muted">
          Ebat: <span className="font-semibold text-ink">{item.sizeLabel}</span>
          {!compact && <span className="ml-2">SKU: {item.sku}</span>}
        </p>
        {!item.available && <p className="text-[12px] font-semibold text-brand-red">Stok yetersiz (stokta {item.stock} adet)</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={Math.max(1, Math.min(20, item.stock))}
            disabled={loading}
            onChange={(q) => updateItem(item.id, q).catch(ignore)}
          />
          <div className="text-right">
            {item.oldUnitPrice && <p className="text-[12px] text-muted line-through">{formatPrice(item.oldUnitPrice * item.quantity)}</p>}
            <p className="font-extrabold">{formatPrice(item.lineTotal)}</p>
          </div>
        </div>
      </div>
    </li>
  );
}
