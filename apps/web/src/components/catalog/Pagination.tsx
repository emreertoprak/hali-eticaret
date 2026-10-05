import Link from 'next/link';

export function Pagination({ page, totalPages, basePath, params }: { page: number; totalPages: number; basePath: string; params: Record<string, string> }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => `${basePath}?${new URLSearchParams({ ...params, page: String(p) })}`;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  return (
    <nav aria-label="Sayfalar" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded-full px-4 py-2 text-[14px] font-semibold hover:bg-cream">
          ‹ Önceki
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`grid size-10 place-items-center rounded-full text-[14px] font-bold ${p === page ? 'bg-charcoal text-white' : 'hover:bg-cream'}`}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className="rounded-full px-4 py-2 text-[14px] font-semibold hover:bg-cream">
          Sonraki ›
        </Link>
      )}
    </nav>
  );
}
