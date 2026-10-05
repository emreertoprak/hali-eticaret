'use client';

import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { errorMessage } from '@/components/ui/AuthForms';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Breadcrumb items={[{ label: 'Giriş Yap', href: '/giris' }, { label: 'Şifremi Unuttum' }]} />
      <div className="container-page pb-16">
        <section className="mx-auto max-w-md rounded-xl border border-line bg-white p-6 shadow-card md:p-8">
          <h1 className="font-serif text-[28px] font-semibold">Şifremi Unuttum</h1>
          {sent ? (
            <div className="mt-4 flex gap-3 rounded-lg bg-[#e3f3ea] p-4 text-[14px] text-[#14532d]" role="status">
              <MailCheck className="shrink-0" />
              <p>{sent} Gelen kutunuzu (ve gereksiz klasörünü) kontrol edin; bağlantı 30 dakika geçerlidir.</p>
            </div>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const email = String(new FormData(e.currentTarget).get('email'));
                setPending(true);
                setError(null);
                try {
                  const res = await apiFetch<{ message: string }>('/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });
                  setSent(res.message);
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setPending(false);
                }
              }}
            >
              <p className="text-[14px] text-muted">Hesabınızın e-posta adresini girin, şifre sıfırlama bağlantısı gönderelim.</p>
              <label className="block">
                <span className="mb-1 block text-[13px] font-semibold">E-posta</span>
                <input name="email" type="email" autoComplete="email" required className="input" />
              </label>
              {error && (
                <p role="alert" className="text-[13px] font-semibold text-brand-red">
                  {error}
                </p>
              )}
              <button className="btn-primary w-full" disabled={pending}>
                {pending ? 'Gönderiliyor…' : 'Bağlantı Gönder'}
              </button>
            </form>
          )}
          <Link href="/giris" className="mt-5 block text-center text-[14px] font-semibold underline">
            Giriş sayfasına dön
          </Link>
        </section>
      </div>
    </>
  );
}
