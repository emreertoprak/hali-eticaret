import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Sayfa yolu" className="container-page py-3 text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-ink">
            Anasayfa
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight size={12} />
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
