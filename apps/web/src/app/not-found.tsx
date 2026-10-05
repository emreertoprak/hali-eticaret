import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="container-page">
      <EmptyState title="Sayfa bulunamadı" text="Aradığınız sayfa kaldırılmış veya taşınmış olabilir." href="/" cta="Ana Sayfaya Dön" />
    </div>
  );
}
