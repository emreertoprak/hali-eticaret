'use client';

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

import { errorText } from './ui';


interface UploadResult {
  files: { url: string }[];
}

/** Sürükle-bırak çoklu görsel yükleyici; değer sıralı URL listesidir (ilki kapak görseli). */
export function ImageUploader({ value, onChange, multiple = true, label = 'Görseller' }: { value: string[]; onChange: (urls: string[]) => void; multiple?: boolean; label?: string }) {
  const { authFetch } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  // Yükleme bitince, yükleme sırasında yapılan silme/sıralama değişikliklerini korumak için güncel değer.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  const upload = async (list: FileList | null) => {
    if (!list?.length || busy) return;
    const form = new FormData();
    Array.from(list)
      .slice(0, multiple ? 10 : 1)
      .forEach((f) => form.append('files', f));
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch<UploadResult>('/admin/uploads', { method: 'POST', body: form });
      const urls = res.files.map((f) => f.url);
      onChange(multiple ? [...latestValue.current, ...urls] : urls.slice(0, 1));
    } catch (err) {
      setError(errorText(err, 'Yükleme başarısız.'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <p className="mb-1 text-[13px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <figure key={url} className="group relative size-28 overflow-hidden rounded-lg border border-line bg-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            {i === 0 && multiple && <span className="absolute top-1 left-1 rounded bg-charcoal px-1.5 py-0.5 text-[10px] font-bold text-white">Kapak</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 p-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
              <button type="button" aria-label="Sola taşı" disabled={i === 0} onClick={() => move(i, i - 1)} className="p-1 disabled:opacity-30">
                <ArrowLeft size={14} />
              </button>
              <button type="button" aria-label="Görseli kaldır" onClick={() => onChange(value.filter((_, j) => j !== i))} className="p-1 text-brand-red">
                <Trash2 size={14} />
              </button>
              <button type="button" aria-label="Sağa taşı" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} className="p-1 disabled:opacity-30">
                <ArrowRight size={14} />
              </button>
            </div>
          </figure>
        ))}
        {(multiple || value.length === 0) && (
          <button
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) void upload(e.dataTransfer.files);
            }}
            className={`grid size-28 place-items-center rounded-lg border-2 border-dashed text-center text-[12px] font-semibold text-muted transition ${drag ? 'border-ink bg-cream' : 'border-line hover:border-ink'}`}
          >
            {busy ? <Loader2 className="animate-spin" /> : (
              <span className="flex flex-col items-center gap-1">
                <ImagePlus size={22} /> Görsel ekle
              </span>
            )}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={multiple} className="sr-only" onChange={(e) => void upload(e.target.files)} />
      <p className="mt-1 text-[12px] text-muted">JPG, PNG, WEBP veya AVIF · en fazla 5 MB</p>
      {error && <p className="mt-1 text-[12px] font-semibold text-brand-red">{error}</p>}
    </div>
  );
}
