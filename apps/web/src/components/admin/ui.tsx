'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-tight font-extrabold">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Notice({ kind = 'error', children, onClose }: { kind?: 'error' | 'success'; children: React.ReactNode; onClose?: () => void }) {
  const cls = kind === 'error' ? 'bg-brand-red/10 text-brand-red-deep' : 'bg-[#e3f3ea] text-[#14532d]';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-[14px] font-semibold ${cls}`}>
      <span>{children}</span>
      {onClose && (
        <button className="text-[12px] underline" onClick={onClose}>
          Kapat
        </button>
      )}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty = 'Kayıt bulunamadı.' }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string | number; onRowClick?: (row: T) => void; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="border-b border-line bg-cream/60 text-[12px] font-bold tracking-wide text-muted uppercase">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-4 py-3 ${c.className ?? ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer transition hover:bg-sand' : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
      <span>Toplam {total} kayıt</span>
      <div className="flex items-center gap-2">
        <button className="rounded-full border border-line bg-white p-2 disabled:opacity-40" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-ink">
          {page} / {totalPages}
        </span>
        <button className="rounded-full border border-line bg-white p-2 disabled:opacity-40" aria-label="Sonraki sayfa" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[13px] font-semibold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-semibold text-brand-red">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-semibold">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 rounded-full bg-line transition peer-checked:bg-charcoal peer-focus-visible:ring-2 peer-focus-visible:ring-gold after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${active ? 'bg-[#e3f3ea] text-[#1d7a46]' : 'bg-line text-muted'}`}>
      {active ? 'Aktif' : 'Pasif'}
    </span>
  );
}

/** API hatasını kullanıcıya gösterilecek metne çevirir; ağ hataları dahil hiçbir hata sessiz kalmaz. */
export function errorText(err: unknown, fallback = 'İşlem başarısız oldu.'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
  return fallback;
}

export const isValidationError = (err: unknown): err is ApiError => err instanceof ApiError && err.code === 'VALIDATION_ERROR';

/** Admin API'den veri yükler; yeniden yükleme ve hata durumunu yönetir. */
export function useAdminData<T>(path: string | null) {
  const { authFetch } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const latest = useRef(0);

  // Hızlı filtre/sayfa değişimlerinde geç dönen eski yanıt yeni veriyi ezmesin: yalnızca son istek yazar.
  const reload = useCallback(async () => {
    if (!path) return;
    const requestId = ++latest.current;
    setLoading(true);
    try {
      const next = await authFetch<T>(path);
      if (requestId !== latest.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (requestId !== latest.current) return;
      setError(errorText(err, 'Veri yüklenemedi.'));
    } finally {
      if (requestId === latest.current) setLoading(false);
    }
  }, [authFetch, path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
