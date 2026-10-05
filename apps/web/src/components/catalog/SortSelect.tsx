'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  ['recommended', 'Önerilen'],
  ['price_asc', 'Fiyat: Artan'],
  ['price_desc', 'Fiyat: Azalan'],
  ['newest', 'En Yeniler'],
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-[14px]">
      <span className="hidden text-muted sm:inline">Sıralama:</span>
      <select
        className="rounded-full border border-line bg-white px-4 py-2 font-semibold outline-none focus:border-ink"
        value={params.get('sort') ?? 'recommended'}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString());
          q.set('sort', e.target.value);
          q.delete('page');
          router.push(`${pathname}?${q}`, { scroll: false });
        }}
      >
        {OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
