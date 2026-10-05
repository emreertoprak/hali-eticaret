import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Noto_Serif, Nunito_Sans } from 'next/font/google';

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

/** Kök layout yalnızca fontlar ve oturum/sepet sağlayıcılarını içerir; vitrin ve yönetim kabukları route gruplarındadır. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${nunito.variable} ${notoSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
