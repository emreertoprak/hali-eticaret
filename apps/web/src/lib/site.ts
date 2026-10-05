import { getHome } from './api';
import type { Home } from './types';

const FALLBACK: Home = {
  brand: { name: 'HALI EVİ', whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '905555555555' },
  announcements: [],
  banners: [],
  storyCategories: [],
  featuredCollections: [],
  newArrivals: [],
  featuredProducts: [],
  commerce: { currency: 'TRY', freeShippingThreshold: 1500, installments: [] },
};

/** Layout verisi: API'ye ulaşılamazsa site yine de açılır (boş içerikle). */
export async function getSiteData(): Promise<Home> {
  try {
    return await getHome();
  } catch {
    return FALLBACK;
  }
}
