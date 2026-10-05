'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { type AdminProduct, type AdminProductResponse, type AdminRecord, type AdminVariant, fieldErrors } from '@/lib/admin';

import { ImageUploader } from './ImageUploader';
import { Card, errorText, Field, isValidationError, Notice, Toggle, useAdminData } from './ui';

const EMPTY_VARIANT: AdminVariant = { sku: '', widthCm: 160, lengthCm: 230, price: 0, discountPrice: null, stock: 0, isActive: true };

export const EMPTY_PRODUCT: AdminProduct = {
  categoryId: 0,
  name: '',
  skuBase: '',
  description: '',
  material: '',
  pileHeight: '',
  origin: 'Türkiye',
  color: '',
  care: '',
  isActive: true,
  isFeatured: false,
  images: [],
  variants: [{ ...EMPTY_VARIANT }],
  collectionIds: [],
};

/** API'den gelen ürünü form durumuna indirger (sunucu alanlarını atar). */
export function toFormProduct(p: AdminProductResponse): AdminProduct {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    slug: p.slug,
    skuBase: p.skuBase,
    description: p.description ?? '',
    material: p.material ?? '',
    pileHeight: p.pileHeight ?? '',
    origin: p.origin ?? '',
    color: p.color ?? '',
    care: p.care ?? '',
    isActive: Boolean(p.isActive),
    isFeatured: Boolean(p.isFeatured),
    images: (p.images ?? []).map((i) => ({ url: i.url, alt: i.alt })),
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      sku: v.sku,
      widthCm: v.widthCm,
      lengthCm: v.lengthCm,
      sizeLabel: v.sizeLabel,
      price: Number(v.price),
      discountPrice: v.discountPrice === null ? null : Number(v.discountPrice),
      stock: v.stock,
      isActive: Boolean(v.isActive),
    })),
    collectionIds: p.collectionIds ?? [],
  };
}

const orNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export function ProductForm({ initial }: { initial: AdminProduct }) {
  const router = useRouter();
  const { authFetch } = useAuth();
  const { data: categories } = useAdminData<AdminRecord[]>('/admin/categories');
  const { data: collections } = useAdminData<AdminRecord[]>('/admin/collections');
  const [p, setP] = useState<AdminProduct>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const setVariant = (i: number, patch: Partial<AdminVariant>) =>
    setP((prev) => ({
      ...prev,
      variants: prev.variants.map((v, j) => {
        if (j !== i) return v;
        // Ölçü değişirse kayıtlı (özel olabilecek) etiket yeniden üretilir; aksi halde korunur.
        const resized = ('widthCm' in patch && patch.widthCm !== v.widthCm) || ('lengthCm' in patch && patch.lengthCm !== v.lengthCm);
        return { ...v, ...patch, ...(resized ? { sizeLabel: undefined } : {}) };
      }),
    }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    setMessage(null);
    const body = {
      categoryId: Number(p.categoryId),
      name: p.name.trim(),
      ...(p.slug ? { slug: p.slug } : {}),
      skuBase: p.skuBase.trim(),
      description: orNull(p.description),
      material: orNull(p.material),
      pileHeight: orNull(p.pileHeight),
      origin: orNull(p.origin),
      color: orNull(p.color),
      care: orNull(p.care),
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      images: p.images.map((img) => ({ url: img.url, alt: img.alt ?? p.name })),
      variants: p.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku.trim() || `${p.skuBase.trim()}-${v.widthCm}${v.lengthCm}`,
        widthCm: Number(v.widthCm),
        lengthCm: Number(v.lengthCm),
        sizeLabel: v.sizeLabel || `${v.widthCm}x${v.lengthCm}`,
        price: Number(v.price),
        discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
        stock: Number(v.stock),
        isActive: v.isActive,
      })),
      collectionIds: p.collectionIds,
    };
    try {
      const saved = await authFetch<AdminProductResponse>(p.id ? `/admin/products/${p.id}` : '/admin/products', {
        method: p.id ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
      if (!p.id) {
        router.replace(`/yonetim/urunler/${saved.id}?kaydedildi=1`);
        return;
      }
      setP(toFormProduct(saved));
      setMessage({ kind: 'success', text: 'Ürün kaydedildi.' });
    } catch (err) {
      if (isValidationError(err)) {
        const fe = fieldErrors(err.details);
        setErrors(fe);
        setMessage({ kind: 'error', text: `Lütfen işaretli alanları kontrol edin (${Object.keys(fe).length} alan).` });
      } else {
        setMessage({ kind: 'error', text: errorText(err, 'Ürün kaydedilemedi.') });
      }
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!p.id || !window.confirm('Ürün pasife alınacak ve vitrinden kaldırılacak. Devam edilsin mi?')) return;
    try {
      await authFetch(`/admin/products/${p.id}`, { method: 'DELETE' });
      setP((prev) => ({ ...prev, isActive: false }));
      setMessage({ kind: 'success', text: 'Ürün pasife alındı.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, 'Ürün pasife alınamadı; vitrinde hâlâ görünüyor.') });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-6"
    >
      {message && (
        <Notice kind={message.kind} onClose={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title="Temel bilgiler">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ürün adı" error={errors.name} className="sm:col-span-2">
                <input className="input" required value={p.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Ürün kodu" error={errors.skuBase} hint="Varyant SKU'ları bu koddan türetilir">
                <input className="input" required value={p.skuBase} onChange={(e) => set('skuBase', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Kategori" error={errors.categoryId}>
                <select className="input" required value={p.categoryId || ''} onChange={(e) => set('categoryId', Number(e.target.value))}>
                  <option value="" disabled>
                    Seçin
                  </option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {String(c.name)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Malzeme" error={errors.material}>
                <input className="input" value={p.material ?? ''} onChange={(e) => set('material', e.target.value)} />
              </Field>
              <Field label="Hav yüksekliği" error={errors.pileHeight}>
                <input className="input" value={p.pileHeight ?? ''} onChange={(e) => set('pileHeight', e.target.value)} placeholder="ör. 9 mm" />
              </Field>
              <Field label="Renk" error={errors.color}>
                <input className="input" value={p.color ?? ''} onChange={(e) => set('color', e.target.value)} />
              </Field>
              <Field label="Üretim yeri" error={errors.origin}>
                <input className="input" value={p.origin ?? ''} onChange={(e) => set('origin', e.target.value)} />
              </Field>
              <Field label="Açıklama" error={errors.description} className="sm:col-span-2">
                <textarea className="input" rows={5} value={p.description ?? ''} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <Field label="Bakım talimatı" error={errors.care} className="sm:col-span-2">
                <textarea className="input" rows={2} value={p.care ?? ''} onChange={(e) => set('care', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title="Görseller">
            <ImageUploader
              value={p.images.map((i) => i.url)}
              onChange={(urls) =>
                setP((prev) => ({ ...prev, images: urls.map((url) => ({ url, alt: prev.images.find((i) => i.url === url)?.alt ?? null })) }))
              }
            />
            {errors.images && <p className="mt-2 text-[13px] font-semibold text-brand-red">{errors.images}</p>}
          </Card>

          <Card
            title="Ebatlar, fiyat ve stok"
            actions={
              <button type="button" className="flex items-center gap-1 text-[13px] font-bold hover:underline" onClick={() => set('variants', [...p.variants, { ...EMPTY_VARIANT }])}>
                <Plus size={14} /> Ebat ekle
              </button>
            }
          >
            {errors.variants && <p className="mb-3 text-[13px] font-semibold text-brand-red">{errors.variants}</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="pb-2 font-semibold">En (cm)</th>
                    <th className="pb-2 font-semibold">Boy (cm)</th>
                    <th className="pb-2 font-semibold">SKU</th>
                    <th className="pb-2 font-semibold">Fiyat (TL)</th>
                    <th className="pb-2 font-semibold">İndirimli (TL)</th>
                    <th className="pb-2 font-semibold">Stok</th>
                    <th className="pb-2 font-semibold">Aktif</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.variants.map((v, i) => (
                    <tr key={v.id ?? `new-${i}`} className={v.isActive ? '' : 'opacity-50'}>
                      {(
                        [
                          ['widthCm', 'w-20', 'number'],
                          ['lengthCm', 'w-20', 'number'],
                          ['sku', 'w-40', 'text'],
                          ['price', 'w-28', 'number'],
                          ['discountPrice', 'w-28', 'number'],
                          ['stock', 'w-20', 'number'],
                        ] as const
                      ).map(([key, w, type]) => (
                        <td key={key} className="py-1 pr-2">
                          <input
                            className={`input ${w} px-2! py-2!`}
                            type={type}
                            step={key === 'price' || key === 'discountPrice' ? '0.01' : '1'}
                            min={type === 'number' ? 0 : undefined}
                            aria-label={`${i + 1}. ebat ${key}`}
                            placeholder={key === 'sku' ? `${p.skuBase || 'KOD'}-${v.widthCm}${v.lengthCm}` : undefined}
                            value={v[key] ?? ''}
                            onChange={(e) =>
                              setVariant(i, {
                                [key]: type === 'number' ? (e.target.value === '' ? (key === 'discountPrice' ? null : 0) : Number(e.target.value)) : e.target.value,
                              } as Partial<AdminVariant>)
                            }
                          />
                        </td>
                      ))}
                      <td className="py-1 pr-2">
                        <input type="checkbox" className="size-4 accent-charcoal" aria-label={`${i + 1}. ebat aktif`} checked={v.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} />
                      </td>
                      <td className="py-1">
                        {!v.id && p.variants.length > 1 && (
                          <button type="button" aria-label="Ebatı kaldır" className="p-1 text-brand-red" onClick={() => set('variants', p.variants.filter((_, j) => j !== i))}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-muted">Kayıtlı ebatlar silinmez (sipariş geçmişi korunur); satıştan kaldırmak için &quot;Aktif&quot; işaretini kaldırın.</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Yayın">
            <div className="space-y-3">
              <Toggle label="Vitrinde aktif" checked={p.isActive} onChange={(v) => set('isActive', v)} />
              <Toggle label="Öne çıkan ürün" checked={p.isFeatured} onChange={(v) => set('isFeatured', v)} />
              {errors.slug && <p className="text-[13px] font-semibold text-brand-red">URL: {errors.slug}</p>}
            </div>
            <button className="btn-primary mt-5 w-full" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            {p.id && p.slug && (
              <a href={`/urun/${p.slug}`} target="_blank" rel="noreferrer" className="mt-3 block text-center text-[13px] font-semibold underline">
                Vitrinde görüntüle
              </a>
            )}
            {p.id && p.isActive && (
              <button type="button" onClick={() => void deactivate()} className="mt-3 w-full text-center text-[13px] font-semibold text-brand-red underline">
                Ürünü pasife al
              </button>
            )}
          </Card>
          <Card title="Koleksiyonlar">
            {errors.collectionIds && <p className="mb-2 text-[13px] font-semibold text-brand-red">{errors.collectionIds}</p>}
            <ul className="space-y-2">
              {collections?.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-[14px]">
                    <input
                      type="checkbox"
                      className="size-4 accent-charcoal"
                      checked={p.collectionIds.includes(c.id)}
                      onChange={(e) => set('collectionIds', e.target.checked ? [...p.collectionIds, c.id] : p.collectionIds.filter((id) => id !== c.id))}
                    />
                    {String(c.name)}
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </form>
  );
}
