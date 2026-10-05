'use client';

import { useState } from 'react';

import type { ProductDetail } from '@/lib/types';

export function ProductTabs({ product }: { product: ProductDetail }) {
  const specs: [string, string | null][] = [
    ['Malzeme', product.material],
    ['Hav Yüksekliği', product.pileHeight],
    ['Renk', product.color],
    ['Üretim Yeri', product.origin],
    ['Ürün Kodu', product.skuBase],
    ['Ebatlar', product.variants.map((v) => v.sizeLabel).join(', ')],
  ];
  const tabs = [
    { id: 'aciklama', label: 'Ürün Açıklaması', content: <p className="max-w-3xl leading-relaxed whitespace-pre-line">{product.description}</p> },
    {
      id: 'ozellikler',
      label: 'Özellikler',
      content: (
        <table className="w-full max-w-2xl text-[14px]">
          <tbody>
            {specs
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <tr key={k} className="border-b border-line">
                  <th className="w-48 py-3 text-left font-semibold">{k}</th>
                  <td className="py-3 text-muted">{v}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ),
    },
    { id: 'bakim', label: 'Bakım', content: <p className="max-w-3xl leading-relaxed">{product.care}</p> },
    {
      id: 'kargo',
      label: 'Kargo & İade',
      content: (
        <ul className="max-w-3xl list-disc space-y-2 pl-5">
          <li>Siparişleriniz 1-3 iş günü içinde kargoya teslim edilir.</li>
          <li>1.500 TL ve üzeri siparişlerde kargo ücretsizdir.</li>
          <li>Ürünü teslim aldıktan sonra 14 gün içinde koşulsuz iade edebilirsiniz.</li>
        </ul>
      ),
    },
  ];
  const [active, setActive] = useState(tabs[0].id);

  return (
    <section className="mt-14">
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`shrink-0 border-b-2 px-4 py-3 text-[14px] font-bold transition ${active === t.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="py-6 text-[15px]">
          {t.content}
        </div>
      ))}
    </section>
  );
}
