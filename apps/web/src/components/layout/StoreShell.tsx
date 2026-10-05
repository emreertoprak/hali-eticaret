import { CartDrawer } from '@/components/cart/CartDrawer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PromoBar } from '@/components/layout/PromoBar';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { getSiteData } from '@/lib/site';

/** Vitrin kabuğu: duyuru/taksit bantları, header, footer, WhatsApp ve sepet çekmecesi. */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  const site = await getSiteData();
  const top = site.announcements.filter((a) => a.placement === 'top');
  const promo = site.announcements.find((a) => a.placement === 'promo');
  return (
    <>
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
    </>
  );
}
