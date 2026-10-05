import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductGrid } from '@/components/product/ProductCard';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductPurchase } from '@/components/product/ProductPurchase';
import { ProductTabs } from '@/components/product/ProductTabs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { getProduct, getProducts, orNull } from '@/lib/api';
import { getSiteData } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await orNull(getProduct((await params).slug));
  if (!product) return {};
  return {
    title: product.name,
    description: product.description?.slice(0, 160),
    openGraph: { images: product.images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await orNull(getProduct(slug));
  if (!product) notFound();

  const [site, similar] = await Promise.all([getSiteData(), getProducts({ category: product.category.slug, limit: '5' })]);
  const related = similar.items.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <>
      <Breadcrumb items={[{ label: product.category.name, href: `/kategori/${product.category.slug}` }, { label: product.name }]} />
      <div className="container-page pb-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {product.collections.map((c) => (
                <Link key={c.slug} href={`/koleksiyon/${c.slug}`} className="label-eyebrow rounded-full bg-cream px-3 py-1.5 hover:bg-line">
                  {c.name}
                </Link>
              ))}
            </div>
            <h1 className="font-serif text-[28px] leading-tight font-semibold md:text-[36px]">{product.name}</h1>
            <p className="mt-2 mb-6 text-[13px] text-muted">
              Ürün kodu: {product.skuBase} · {product.material}
            </p>
            <ProductPurchase product={product} installments={site.commerce.installments} whatsapp={site.brand.whatsapp} />
          </div>
        </div>

        <ProductTabs product={product} />

        {related.length > 0 && (
          <section className="mt-10">
            <SectionHeading title="Benzer Ürünler" href={`/kategori/${product.category.slug}`} />
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  );
}
