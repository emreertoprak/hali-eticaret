import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { LoginForm, RegisterForm } from '@/components/ui/AuthForms';

export const metadata: Metadata = { title: 'Giriş Yap / Üye Ol' };

export default function LoginPage() {
  return (
    <>
      <Breadcrumb items={[{ label: 'Giriş Yap' }]} />
      <div className="container-page grid gap-6 pb-16 md:grid-cols-2 lg:gap-10">
        <section className="rounded-xl border border-line bg-white p-6 shadow-card md:p-8">
          <h1 className="mb-6 font-serif text-[28px] font-semibold">Giriş Yap</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </section>
        <section id="kayit" className="rounded-xl border border-line bg-cream p-6 md:p-8">
          <h2 className="mb-6 font-serif text-[28px] font-semibold">Üye Ol</h2>
          <Suspense>
            <RegisterForm />
          </Suspense>
        </section>
      </div>
    </>
  );
}
