import { CategoryStories } from '@/components/home/CategoryStories';
import { CollectionTiles } from '@/components/home/CollectionTiles';
import { HeroSlider } from '@/components/home/HeroSlider';
import { FeatureStrip } from '@/components/layout/Footer';
import { ProductGrid } from '@/components/product/ProductCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getSiteData } from '@/lib/site';

export default async function HomePage() {
  const home = await getSiteData();
  return (
    <>
      <p className="container-page pt-3 pb-2 text-[13px] text-muted">Anasayfa</p>
      <CategoryStories categories={home.storyCategories} />
      <div className="mt-3">
        <HeroSlider banners={home.banners} />
      </div>

      <section className="container-page py-14 md:py-20">
        <SectionHeading eyebrow="Yeni Sezon" title="Yeni Gelenler" href="/urunler?sort=newest" />
        <ProductGrid products={home.newArrivals} />
      </section>

      {home.featuredCollections.length > 0 && (
        <section className="bg-sand py-14 md:py-20">
          <div className="container-page">
            <SectionHeading eyebrow="Seçkiler" title="Koleksiyonlar" href="/koleksiyonlar" />
            <CollectionTiles collections={home.featuredCollections} />
          </div>
        </section>
      )}

      {home.featuredProducts.length > 0 && (
        <section className="container-page py-14 md:py-20">
          <SectionHeading eyebrow="Editörün Seçimi" title="Öne Çıkan Halılar" href="/urunler" />
          <ProductGrid products={home.featuredProducts} />
        </section>
      )}

      <FeatureStrip />
    </>
  );
}
