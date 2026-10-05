import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/EmptyState';

export const metadata: Metadata = { title: 'Yakında' };

export default function ComingSoonPage() {
  return (
    <div className="container-page">
      <EmptyState title="Çok yakında" text="Bu bölüm üzerinde çalışıyoruz. Yeni koleksiyonlar ve içerikler için bizi takipte kalın." href="/urunler" cta="Halıları Keşfet" />
    </div>
  );
}
