'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function SearchBox({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-cream shadow-float">
      <form
        className="container-page flex items-center gap-3 py-4"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (!q.trim()) return;
          router.push(`/arama?q=${encodeURIComponent(q.trim())}`);
          onClose();
        }}
      >
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Halı, kilim, koleksiyon ara..."
            aria-label="Ürün ara"
            className="input rounded-full! pl-11"
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          />
        </div>
        <button type="submit" className="btn-primary px-6! py-3!">
          Ara
        </button>
        <button type="button" aria-label="Aramayı kapat" onClick={onClose} className="p-2 text-ink/70 hover:text-ink">
          <X size={20} />
        </button>
      </form>
    </div>
  );
}
