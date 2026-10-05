import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Noto_Serif, Nunito_Sans } from 'next/font/google';

import { CartDrawer } from '@/components/cart/CartDrawer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PromoBar } from '@/components/layout/PromoBar';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { getSiteData } from '@/lib/site';

import { Providers } from './providers';

const nunito = Nunito_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-nunito', display: 'swap' });
const notoSerif = Noto_Serif({ subsets: ['latin', 'latin-ext'], weight: ['500', '600'], variable: '--font-noto-serif', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getSiteData();
  return {
    title: { default: `${brand.name} | El Dokuma, Modern ve Klasik Halılar`, template: `%s | ${brand.name}` },
    description: 'Afgan, kilim, shaggy, vintage ve daha fazlası. Vade farksız taksit ve ücretsiz kargo fırsatlarıyla halı alışverişi.',
  };
}

export const viewport: Viewport = { themeColor: '#f3f1ec' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteData();
  const top = site.announcements.filter((a) => a.placement === 'top');
  const promo = site.announcements.find((a) => a.placement === 'promo');

  return (
    <html lang="tr" className={`${nunito.variable} ${notoSerif.variable}`}>
      <body>
        <Providers>
          <a href="#icerik" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2">
            İçeriğe geç
          </a>
          <AnnouncementBar items={top} />
          <PromoBar item={promo} />
          <Header brand={site.brand.name} categories={site.storyCategories} />
          <main id="icerik" className="min-h-[50vh]">
            {children}
          </main>
          <Footer brand={site.brand.name} categories={site.storyCategories} />
          <WhatsAppButton phone={site.brand.whatsapp} />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
