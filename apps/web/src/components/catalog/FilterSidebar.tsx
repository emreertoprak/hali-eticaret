'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { formatPrice } from '@/lib/format';
import type { ProductPage } from '@/lib/types';

export function FilterSidebar({ facets }: { facets: ProductPage['facets'] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sizes, setSizes] = useState<string[]>(params.get('size')?.split(',').filter(Boolean) ?? []);
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');

  const apply = (next: { sizes?: string[]; minPrice?: string; maxPrice?: string } = {}) => {
    const q = new URLSearchParams(params.toString());
    const s = next.sizes ?? sizes;
    const min = next.minPrice ?? minPrice;
    const max = next.maxPrice ?? maxPrice;
    if (s.length) q.set('size', s.join(','));
    else q.delete('size');
    if (min) q.set('minPrice', min);
    else q.delete('minPrice');
    if (max) q.set('maxPrice', max);
    else q.delete('maxPrice');
    q.delete('page');
    router.push(`${pathname}?${q}`, { scroll: false });
    setMobileOpen(false);
  };

  const reset = () => {
    setSizes([]);
    setMinPrice('');
    setMaxPrice('');
    apply({ sizes: [], minPrice: '', maxPrice: '' });
  };

  const active = sizes.length > 0 || minPrice || maxPrice;

  const panel = (
    <div className="space-y-7">
      <fieldset>
        <legend className="label-eyebrow mb-3">Ebat</legend>
        <ul className="space-y-2">
          {facets.sizes.map((s) => (
            <li key={s.label}>
              <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  className="size-4 rounded accent-charcoal"
                  checked={sizes.includes(s.label)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...sizes, s.label] : sizes.filter((x) => x !== s.label);
                    setSizes(next);
                    apply({ sizes: next });
                  }}
                />
                <span className="flex-1">{s.label} cm</span>
                <span className="text-[12px] text-muted">({s.count})</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="label-eyebrow mb-3">Fiyat Aralığı</legend>
        <p className="mb-2 text-[12px] text-muted">
          {formatPrice(facets.priceRange.min)} – {formatPrice(facets.priceRange.max)}
        </p>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <input className="input px-3! py-2!" inputMode="numeric" placeholder="En az" aria-label="En az fiyat" value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))} />
          <span className="text-muted">–</span>
          <input className="input px-3! py-2!" inputMode="numeric" placeholder="En çok" aria-label="En çok fiyat" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))} />
          <button className="sr-only">Uygula</button>
        </form>
      </fieldset>

      <div className="flex gap-2">
        <button className="btn-primary flex-1 px-4!" onClick={() => apply()}>
          Filtreleri Uygula
        </button>
        {active && (
          <button className="rounded-full px-3 text-[13px] font-semibold underline" onClick={reset}>
            Temizle
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button className="btn-outline px-5! py-2! text-[14px] lg:hidden" onClick={() => setMobileOpen(true)}>
        <SlidersHorizontal size={16} /> Filtrele {active ? '•' : ''}
      </button>
      <aside className="hidden w-64 shrink-0 lg:block" aria-label="Filtreler">
        {panel}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtreler">
          <button className="absolute inset-0 bg-charcoal/40" aria-label="Kapat" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-float">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-bold">Filtreler</p>
              <button aria-label="Kapat" onClick={() => setMobileOpen(false)}>
                <X size={22} />
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
