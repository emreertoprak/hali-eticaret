'use client';

import { ResourceManager, Thumb } from '@/components/admin/ResourceManager';

export default function AdminCategoriesPage() {
  return (
    <ResourceManager
      config={{
        title: 'Kategoriler',
        description: 'Ana sayfadaki story halkaları ve kategori sayfaları',
        endpoint: '/admin/categories',
        singular: 'Kategori',
        fields: [
          { name: 'name', label: 'Ad', type: 'text', required: true },
          { name: 'slug', label: 'URL (slug)', type: 'text', hint: 'Boş bırakılırsa addan üretilir. Değiştirmek eski bağlantıları bozar.' },
          { name: 'description', label: 'Açıklama', type: 'textarea' },
          { name: 'imageUrl', label: 'Story görseli', type: 'image' },
          { name: 'sortOrder', label: 'Sıra', type: 'number' },
          { name: 'showInStories', label: 'Ana sayfa story satırında göster', type: 'toggle', defaultValue: true },
          { name: 'isActive', label: 'Aktif', type: 'toggle', defaultValue: true },
        ],
        columns: [
          { key: 'image', header: '', render: (r) => <Thumb url={r.imageUrl} round /> },
          { key: 'name', header: 'Ad', render: (r) => <span className="font-semibold">{String(r.name)}</span> },
          { key: 'slug', header: 'URL', render: (r) => <span className="text-muted">/kategori/{String(r.slug)}</span> },
          { key: 'sort', header: 'Sıra', render: (r) => String(r.sortOrder) },
          { key: 'stories', header: 'Story', render: (r) => (r.showInStories ? 'Evet' : 'Hayır') },
        ],
      }}
    />
  );
}
