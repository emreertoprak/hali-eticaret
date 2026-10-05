'use client';

import { ResourceManager, Thumb } from '@/components/admin/ResourceManager';

export default function AdminCollectionsPage() {
  return (
    <ResourceManager
      config={{
        title: 'Koleksiyonlar',
        description: 'Ana sayfa koleksiyon karoları ve koleksiyon sayfaları',
        endpoint: '/admin/collections',
        singular: 'Koleksiyon',
        fields: [
          { name: 'name', label: 'Ad', type: 'text', required: true },
          { name: 'slug', label: 'URL (slug)', type: 'text', hint: 'Boş bırakılırsa addan üretilir.' },
          { name: 'description', label: 'Açıklama', type: 'textarea' },
          { name: 'imageUrl', label: 'Karo görseli (dikey)', type: 'image' },
          { name: 'bannerUrl', label: 'Sayfa banner görseli (yatay)', type: 'image' },
          { name: 'sortOrder', label: 'Sıra', type: 'number' },
          { name: 'isFeatured', label: 'Ana sayfada göster', type: 'toggle', defaultValue: false },
          { name: 'isActive', label: 'Aktif', type: 'toggle', defaultValue: true },
        ],
        columns: [
          { key: 'image', header: '', render: (r) => <Thumb url={r.imageUrl} /> },
          { key: 'name', header: 'Ad', render: (r) => <span className="font-semibold">{String(r.name)}</span> },
          { key: 'slug', header: 'URL', render: (r) => <span className="text-muted">/koleksiyon/{String(r.slug)}</span> },
          { key: 'featured', header: 'Ana sayfa', render: (r) => (r.isFeatured ? 'Evet' : 'Hayır') },
        ],
      }}
    />
  );
}
