'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { errorMessage } from '@/components/ui/AuthForms';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { AuthResponse } from '@/lib/types';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const { applySession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <p className="mt-4 text-[14px] text-muted">
        Bağlantı eksik görünüyor.{' '}
        <Link href="/sifremi-unuttum" className="underline">
          Yeni bağlantı isteyin
        </Link>
        .
      </p>
    );
  }

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const password = String(data.get('password'));
        if (password !== String(data.get('confirm'))) {
          setError('Şifreler eşleşmiyor.');
          return;
        }
        setPending(true);
        setError(null);
        try {
          applySession(await apiFetch<AuthResponse>('/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }));
          router.replace('/hesabim?sifre=yenilendi');
        } catch (err) {
          setError(errorMessage(err));
          setPending(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">Yeni şifre</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="input" />
        <span className="mt-1 block text-[12px] text-muted">En az 8 karakter; harf ve rakam içermeli</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">Yeni şifre (tekrar)</span>
        <input name="confirm" type="password" autoComplete="new-password" required className="input" />
      </label>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-brand-red">
          {error}{' '}
          {error.includes('bağlantı') && (
            <Link href="/sifremi-unuttum" className="underline">
              Yeni bağlantı iste
            </Link>
          )}
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Şifre Sıfırla' }]} />
      <div className="container-page pb-16">
        <section className="mx-auto max-w-md rounded-xl border border-line bg-white p-6 shadow-card md:p-8">
          <h1 className="font-serif text-[28px] font-semibold">Yeni Şifre Belirle</h1>
          <Suspense>
            <ResetForm />
          </Suspense>
        </section>
      </div>
    </>
  );
}
