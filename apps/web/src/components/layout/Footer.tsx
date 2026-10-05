import { CreditCard, Lock, RotateCcw, Truck } from 'lucide-react';
import Link from 'next/link';

import type { Category } from '@/lib/types';

const FEATURES = [
  { icon: Truck, title: 'Ücretsiz Kargo', text: '1.500 TL üzeri siparişlerde' },
  { icon: RotateCcw, title: '14 Gün İade', text: 'Koşulsuz iade garantisi' },
  { icon: Lock, title: 'Güvenli Ödeme', text: '256-bit SSL koruması' },
  { icon: CreditCard, title: 'Vade Farksız Taksit', text: '15.000 TL üzeri 5 taksit' },
];

export function FeatureStrip() {
  return (
    <section className="border-y border-line bg-cream">
      <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-card">
              <Icon size={20} strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-[14px] font-bold">{title}</p>
              <p className="text-[13px] text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer({ brand, categories }: { brand: string; categories: Category[] }) {
  return (
    <footer className="bg-charcoal text-[#e9e9e9]">
      <div
        className="h-2"
        style={{
          background:
            'repeating-linear-gradient(90deg,#c8102e 0 18px,#ffc94d 18px 36px,#1f1f1f 36px 40px,#f3f1ec 40px 58px,#1f1f1f 58px 62px)',
        }}
        aria-hidden="true"
      />
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-serif text-2xl tracking-[0.18em] uppercase">{brand}</p>
          <p className="mt-3 max-w-sm text-[14px] text-[#a0a0a0]">
            Anadolu dokuma geleneğini modern yaşam alanlarıyla buluşturan halı ve kilim koleksiyonları.
          </p>
          <form className="mt-6 flex max-w-sm gap-2" action="/yakinda">
            <input
              type="email"
              name="email"
              required
              placeholder="E-posta adresiniz"
              aria-label="Bülten için e-posta"
              className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-gold"
            />
            <button className="rounded-full bg-gold px-5 text-[14px] font-bold text-ink">Abone Ol</button>
          </form>
        </div>
        <FooterColumn
          title="Kurumsal"
          links={[
            ['Hakkımızda', '/yakinda'],
            ['Mağazalarımız', '/yakinda'],
            ['Kariyer', '/yakinda'],
            ['Blog', '/yakinda'],
          ]}
        />
        <FooterColumn
          title="Müşteri Hizmetleri"
          links={[
            ['Siparişlerim', '/hesabim/siparisler'],
            ['Kargo & Teslimat', '/yakinda'],
            ['İade & Değişim', '/yakinda'],
            ['Mesafeli Satış Sözleşmesi', '/yakinda'],
            ['KVKK Aydınlatma Metni', '/yakinda'],
          ]}
        />
        <FooterColumn title="Kategoriler" links={categories.slice(0, 7).map((c) => [c.name, `/kategori/${c.slug}`])} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-5 text-[12px] text-[#a0a0a0] md:flex-row">
          <p>
            © {new Date().getFullYear()} {brand}. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-2" aria-label="Ödeme yöntemleri">
            {['VISA', 'Mastercard', 'TROY', 'Havale/EFT'].map((m) => (
              <span key={m} className="rounded border border-white/15 px-2.5 py-1 font-semibold tracking-wide text-white/70">
                {m}
              </span>
            ))}
            <span className="flex items-center gap-1 rounded border border-white/15 px-2.5 py-1 text-white/70">
              <Lock size={12} /> SSL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <p className="label-eyebrow mb-4 text-white">{title}</p>
      <ul className="space-y-2.5 text-[14px] text-[#a0a0a0]">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
