'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { Announcement } from '@/lib/types';

export function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count]);

  if (!count) return <div className="h-1 bg-brand-red" />;
  const current = items[index];
  const text = <span className="truncate">{current.text}</span>;

  return (
    <div className="border-t-4 border-brand-red bg-announce text-[13px] text-ink">
      <div className="container-page flex h-8 items-center justify-between gap-2">
        <button aria-label="Önceki duyuru" className="p-1 text-ink/70 hover:text-ink" onClick={() => setIndex((index - 1 + count) % count)}>
          <ChevronLeft size={16} />
        </button>
        <p key={current.id} className="flex min-w-0 animate-[fadeIn_.4s_ease] justify-center" aria-live="polite">
          {current.url ? (
            <Link href={current.url} className="truncate hover:underline" target={current.url.startsWith('http') ? '_blank' : undefined}>
              {text}
            </Link>
          ) : (
            text
          )}
        </p>
        <button aria-label="Sonraki duyuru" className="p-1 text-ink/70 hover:text-ink" onClick={() => setIndex((index + 1) % count)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
