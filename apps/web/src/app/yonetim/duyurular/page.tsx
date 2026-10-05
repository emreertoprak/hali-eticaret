'use client';

import { ResourceManager } from '@/components/admin/ResourceManager';

const PLACEMENTS = { top: 'Üst kayan bant', promo: 'Sarı taksit bandı' };

export default function AdminAnnouncementsPage() {
  return (
    <ResourceManager
      config={{
        title: 'Duyurular',
        description: 'Sitenin en üstündeki kayan duyuru bandı ve sarı kampanya bandı',
        endpoint: '/admin/announcements',
        singular: 'Duyuru',
        fields: [
          { name: 'placement', label: 'Yer', type: 'select', options: Object.entries(PLACEMENTS).map(([value, label]) => ({ value, label })) },
          { name: 'text', label: 'Metin', type: 'text', required: true },
          { name: 'url', label: 'Bağlantı (opsiyonel)', type: 'text' },
          { name: 'sortOrder', label: 'Sıra', type: 'number' },
          { name: 'isActive', label: 'Aktif', type: 'toggle', defaultValue: true },
        ],
        columns: [
          { key: 'placement', header: 'Yer', render: (r) => PLACEMENTS[r.placement as keyof typeof PLACEMENTS] },
          { key: 'text', header: 'Metin', render: (r) => <span className="font-semibold">{String(r.text)}</span> },
          { key: 'sort', header: 'Sıra', render: (r) => String(r.sortOrder) },
        ],
      }}
    />
  );
}
