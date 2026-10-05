'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

import { GoogleSignIn } from './GoogleSignIn';

/** Google ile giriş/kayıt; ikisi de aynı uca gider (hesap yoksa oluşturulur). */
function GoogleButton({ context, onError }: { context: 'signin' | 'signup'; onError: (m: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const redirect = useRedirect();
  return (
    <GoogleSignIn
      context={context}
      onCredential={async (credential) => {
        try {
          await loginWithGoogle(credential);
          router.push(redirect);
        } catch (err) {
          onError(errorMessage(err));
        }
      }}
    />
  );
}

function useRedirect() {
  const params = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/hesabim';
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fields = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
    const first = fields && Object.values(fields).flat()[0];
    return first ?? err.message;
  }
  if (err instanceof TypeError) return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.';
  return 'Bir hata oluştu, lütfen tekrar deneyin.';
}

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const redirect = useRedirect();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        try {
          await login(String(data.get('email')), String(data.get('password')));
          router.push(redirect);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">E-posta</span>
        <input name="email" type="email" autoComplete="email" required className="input" />
      </label>
      <label className="block">
        <span className="mb-1 flex items-center justify-between text-[13px] font-semibold">
          Şifre
          <Link href="/sifremi-unuttum" className="font-normal text-muted underline hover:text-ink">
            Şifremi unuttum
          </Link>
        </span>
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-brand-red">
          {error}
        </p>
      )}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </button>
      <GoogleButton context="signin" onError={setError} />
      <p className="text-center text-[12px] text-muted">Demo hesap: demo@halievi.local / Demo1234!</p>
    </form>
  );
}

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const redirect = useRedirect();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setPending(true);
        setError(null);
        try {
          const phone = String(data.get('phone') ?? '').trim();
          await register({
            firstName: String(data.get('firstName')),
            lastName: String(data.get('lastName')),
            email: String(data.get('email')),
            password: String(data.get('password')),
            ...(phone ? { phone } : {}),
          });
          router.push(redirect);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold">Ad</span>
          <input name="firstName" autoComplete="given-name" required className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold">Soyad</span>
          <input name="lastName" autoComplete="family-name" required className="input" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">E-posta</span>
        <input name="email" type="email" autoComplete="email" required className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">Telefon (opsiyonel)</span>
        <input name="phone" type="tel" autoComplete="tel" placeholder="5XX XXX XX XX" className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-semibold">Şifre</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="input" />
        <span className="mt-1 block text-[12px] text-muted">En az 8 karakter; harf ve rakam içermeli</span>
      </label>
      <label className="flex items-start gap-2 text-[13px]">
        <input type="checkbox" required className="mt-1 size-4 accent-charcoal" />
        <span>KVKK aydınlatma metnini okudum, üyelik sözleşmesini kabul ediyorum.</span>
      </label>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-brand-red">
          {error}
        </p>
      )}
      <button className="btn-outline w-full" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Üye Ol'}
      </button>
      <GoogleButton context="signup" onError={setError} />
    </form>
  );
}
