'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { type AdminRecord, fieldErrors } from '@/lib/admin';

import { ImageUploader } from './ImageUploader';
import { ActiveBadge, DataTable, errorText, Field, isValidationError, Notice, PageHeader, Toggle, useAdminData } from './ui';

export type FieldDef =
  | { name: string; label: string; type: 'text' | 'textarea' | 'url'; required?: boolean; hint?: string; nullable?: boolean }
  | { name: string; label: string; type: 'number'; defaultValue?: number }
  | { name: string; label: string; type: 'toggle'; defaultValue?: boolean }
  | { name: string; label: string; type: 'image'; required?: boolean }
  | { name: string; label: string; type: 'select'; options: { value: string; label: string }[]; defaultValue?: string };

export interface ResourceConfig {
  title: string;
  description: string;
  endpoint: string; // ör. /admin/categories
  singular: string;
  fields: FieldDef[];
  columns: { key: string; header: string; render: (row: AdminRecord) => React.ReactNode; className?: string }[];
}

function emptyValues(fields: FieldDef[]): Record<string, unknown> {
  return Object.fromEntries(
    fields.map((f) => [f.name, f.type === 'toggle' ? (f.defaultValue ?? true) : f.type === 'number' ? (f.defaultValue ?? 0) : f.type === 'select' ? (f.defaultValue ?? f.options[0]?.value) : '']),
  );
}

/** Formdaki değerleri API gövdesine çevirir: boş metin → null (opsiyonel alanlar) veya hiç gönderilmez. */
function toBody(fields: FieldDef[], values: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (f.type === 'number') body[f.name] = Number(v ?? 0);
    else if (f.type === 'toggle') body[f.name] = Boolean(v);
    else if (typeof v === 'string' && v.trim() === '') {
      if (f.type !== 'select' && !('required' in f && f.required) && f.name !== 'slug') body[f.name] = null;
    } else body[f.name] = typeof v === 'string' ? v.trim() : v;
  }
  return body;
}

export function ResourceManager({ config }: { config: ResourceConfig }) {
  const { authFetch } = useAuth();
  const { data, error, reload } = useAdminData<AdminRecord[]>(config.endpoint);
  const [editing, setEditing] = useState<AdminRecord | 'new' | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const open = (row: AdminRecord | 'new') => {
    setEditing(row);
    setErrors({});
    setValues(row === 'new' ? emptyValues(config.fields) : Object.fromEntries(config.fields.map((f) => [f.name, row[f.name] ?? (f.type === 'toggle' ? false : '')])));
  };

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const isNew = editing === 'new';
      await authFetch(isNew ? config.endpoint : `${config.endpoint}/${(editing as AdminRecord).id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(toBody(config.fields, values)),
      });
      setEditing(null);
      setMessage({ kind: 'success', text: `${config.singular} kaydedildi.` });
      await reload();
    } catch (err) {
      const fe = isValidationError(err) ? fieldErrors(err.details) : {};
      setErrors(Object.keys(fe).length ? fe : { _form: errorText(err, `${config.singular} kaydedilemedi.`) });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AdminRecord) => {
    if (!window.confirm(`"${String(row.name ?? row.title ?? row.text)}" silinsin mi?`)) return;
    try {
      await authFetch(`${config.endpoint}/${row.id}`, { method: 'DELETE' });
      setMessage({ kind: 'success', text: `${config.singular} silindi.` });
      await reload();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, 'Silinemedi.') });
    }
  };

  const set = (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v }));

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <button className="btn-primary px-5! py-2.5!" onClick={() => open('new')}>
            <Plus size={16} /> Yeni {config.singular}
          </button>
        }
      />
      {message && (
        <Notice kind={message.kind} onClose={() => setMessage(null)}>
          {message.text}
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      {!data ? (
        <p className="py-16 text-center text-muted">Yükleniyor…</p>
      ) : (
        <DataTable
          rows={data}
          rowKey={(r) => r.id}
          columns={[
            ...config.columns,
            ...(config.fields.some((f) => f.name === 'isActive') ? [{ key: 'active', header: 'Durum', render: (r: AdminRecord) => <ActiveBadge active={Boolean(r.isActive)} /> }] : []),
            {
              key: 'actions',
              header: '',
              className: 'text-right whitespace-nowrap',
              render: (r: AdminRecord) => (
                <span className="inline-flex gap-1">
                  <button className="rounded-full p-2 hover:bg-cream" aria-label="Düzenle" onClick={() => open(r)}>
                    <Pencil size={15} />
                  </button>
                  <button className="rounded-full p-2 text-brand-red hover:bg-brand-red/10" aria-label="Sil" onClick={() => void remove(r)}>
                    <Trash2 size={15} />
                  </button>
                </span>
              ),
            },
          ]}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${config.singular} düzenle`}>
          <button className="absolute inset-0 bg-charcoal/40" aria-label="Kapat" onClick={() => setEditing(null)} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-float"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-lg font-bold">{editing === 'new' ? `Yeni ${config.singular}` : `${config.singular} düzenle`}</h2>
              <button type="button" aria-label="Kapat" onClick={() => setEditing(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {errors._form && <Notice>{errors._form}</Notice>}
              {config.fields.map((f) => {
                const v = values[f.name];
                switch (f.type) {
                  case 'toggle':
                    return <Toggle key={f.name} label={f.label} checked={Boolean(v)} onChange={(c) => set(f.name, c)} />;
                  case 'image':
                    return (
                      <div key={f.name}>
                        <ImageUploader label={f.label} multiple={false} value={v ? [String(v)] : []} onChange={(urls) => set(f.name, urls[0] ?? '')} />
                        {errors[f.name] && <p className="mt-1 text-[12px] font-semibold text-brand-red">{errors[f.name]}</p>}
                      </div>
                    );
                  case 'select':
                    return (
                      <Field key={f.name} label={f.label} error={errors[f.name]}>
                        <select className="input" value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)}>
                          {f.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    );
                  case 'textarea':
                    return (
                      <Field key={f.name} label={f.label} error={errors[f.name]} hint={f.hint}>
                        <textarea className="input" rows={3} value={String(v ?? '')} required={f.required} onChange={(e) => set(f.name, e.target.value)} />
                      </Field>
                    );
                  case 'number':
                    return (
                      <Field key={f.name} label={f.label} error={errors[f.name]}>
                        <input className="input w-32" type="number" value={String(v ?? 0)} onChange={(e) => set(f.name, Number(e.target.value))} />
                      </Field>
                    );
                  default:
                    return (
                      <Field key={f.name} label={f.label} error={errors[f.name]} hint={f.hint}>
                        <input className="input" value={String(v ?? '')} required={f.required} onChange={(e) => set(f.name, e.target.value)} />
                      </Field>
                    );
                }
              })}
            </div>
            <div className="flex gap-3 border-t border-line px-6 py-4">
              <button className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setEditing(null)}>
                Vazgeç
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/** Tablo hücresinde küçük görsel önizleme. */
export function Thumb({ url, round = false }: { url: unknown; round?: boolean }) {
  return (
    <span className={`block size-11 overflow-hidden bg-cream ${round ? 'rounded-full' : 'rounded'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={String(url)} alt="" className="size-full object-cover" /> : null}
    </span>
  );
}
