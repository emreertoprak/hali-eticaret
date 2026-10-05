'use client';

import { ResourceManager, Thumb } from '@/components/admin/ResourceManager';

export default function AdminBannersPage() {
  return (
    <ResourceManager
      config={{
        title: 'Bannerlar',
        description: 'Ana sayfa hero slider',
        endpoint: '/admin/banners',
        singular: 'Banner',
        fields: [
          { name: 'title', label: 'Başlık', type: 'text', required: true },
          { name: 'subtitle', label: 'Üst yazı', type: 'text' },
          { name: 'imageUrl', label: 'Görsel (yatay, en az 1920px)', type: 'image', required: true },
          { name: 'mobileImageUrl', label: 'Mobil görsel (opsiyonel)', type: 'image' },
          { name: 'ctaText', label: 'Buton yazısı', type: 'text' },
          { name: 'ctaUrl', label: 'Buton bağlantısı', type: 'text', hint: 'ör. /koleksiyon/hand-woven' },
          { name: 'sortOrder', label: 'Sıra', type: 'number' },
          { name: 'isActive', label: 'Aktif', type: 'toggle', defaultValue: true },
        ],
        columns: [
          { key: 'image', header: '', render: (r) => <Thumb url={r.imageUrl} /> },
          { key: 'title', header: 'Başlık', render: (r) => <span className="font-semibold">{String(r.title)}</span> },
          { key: 'cta', header: 'Bağlantı', render: (r) => <span className="text-muted">{String(r.ctaUrl ?? '—')}</span> },
          { key: 'sort', header: 'Sıra', render: (r) => String(r.sortOrder) },
        ],
      }}
    />
  );
}
