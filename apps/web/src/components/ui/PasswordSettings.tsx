'use client';

import { KeyRound, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { AuthResponse } from '@/lib/types';

import { errorMessage } from './AuthForms';

/** Şifre değiştirme (Google ile açılmış hesaplarda ilk şifreyi belirleme) ve tüm cihazlardan çıkış. */
export function PasswordSettings() {
  const { user, authFetch, applySession, logout } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  if (!user) return null;

  return (
    <section className="mt-8 grid gap-6 md:grid-cols-2">
      <form
        className="space-y-3 rounded-xl border border-line bg-white p-5 shadow-card"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const d = new FormData(form);
          setPending(true);
          setMessage(null);
          try {
            const auth = await authFetch<AuthResponse>('/auth/password', {
              method: 'POST',
              body: JSON.stringify({ ...(user.hasPassword ? { currentPassword: String(d.get('current')) } : {}), newPassword: String(d.get('next')) }),
            });
            applySession(auth);
            form.reset();
            setMessage({ ok: true, text: 'Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.' });
          } catch (err) {
            setMessage({ ok: false, text: errorMessage(err) });
          } finally {
            setPending(false);
          }
        }}
      >
        <h2 className="flex items-center gap-2 font-bold">
          <KeyRound size={18} /> {user.hasPassword ? 'Şifre Değiştir' : 'Şifre Belirle'}
        </h2>
        {!user.hasPassword && <p className="text-[13px] text-muted">Hesabınıza Google ile giriş yapıyorsunuz. İsterseniz e-posta ile giriş için şifre belirleyebilirsiniz.</p>}
        {user.hasPassword && (
          <input name="current" type="password" autoComplete="current-password" required placeholder="Mevcut şifre" aria-label="Mevcut şifre" className="input" />
        )}
        <input name="next" type="password" autoComplete="new-password" minLength={8} maxLength={72} required placeholder="Yeni şifre" aria-label="Yeni şifre" className="input" />
        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={`text-[13px] font-semibold ${message.ok ? 'text-[#1d7a46]' : 'text-brand-red'}`}>
            {message.text}
          </p>
        )}
        <button className="btn-outline px-6! py-2.5!" disabled={pending}>
          Kaydet
        </button>
      </form>
      <div className="space-y-3 rounded-xl border border-line bg-white p-5 shadow-card">
        <h2 className="flex items-center gap-2 font-bold">
          <LogOut size={18} /> Oturumlar
        </h2>
        <p className="text-[13px] text-muted">Hesabınıza başka bir cihazdan giriş yapıldığını düşünüyorsanız tüm oturumları kapatın.</p>
        <button
          className="btn-outline px-6! py-2.5!"
          onClick={async () => {
            await authFetch('/auth/logout-all', { method: 'POST' }).catch(() => undefined);
            router.replace('/giris');
            await logout();
          }}
        >
          Tüm cihazlardan çıkış yap
        </button>
      </div>
    </section>
  );
}
