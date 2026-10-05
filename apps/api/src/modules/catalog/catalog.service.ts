import { loadConfig } from '@/config/Config';
import { bumpNamespace, cached, CacheKeys, CacheNamespaces, namespaceVersion } from '@/infra/cache';
import { AppError } from '@/utils/AppError';
import { paginate } from '@/utils/pagination';

import { discountRate, toCategory, toCollection, toProductListItem, toVariant } from './catalog.mappers';
import { CatalogRepository } from './catalog.repository';
import type { ProductListQuery } from './catalog.schemas';
import type { ProductDetailDto } from './catalog.types';

export class CatalogService {
  constructor(private readonly repo = new CatalogRepository()) {}

  listCategories() {
    const { cache } = loadConfig();
    return cached(CacheKeys.categories, cache.catalogTtlSeconds, async () =>
      (await this.repo.listCategories()).map(toCategory),
    );
  }

  async getCategory(slug: string) {
    const row = await this.repo.findCategoryBySlug(slug);
    if (!row) throw AppError.notFound('Kategori bulunamadı.');
    return toCategory(row);
  }

  listCollections() {
    const { cache } = loadConfig();
    return cached(CacheKeys.collections, cache.catalogTtlSeconds, async () =>
      (await this.repo.listCollections()).map(toCollection),
    );
  }

  async getCollection(slug: string) {
    const row = await this.repo.findCollectionBySlug(slug);
    if (!row) throw AppError.notFound('Koleksiyon bulunamadı.');
    return toCollection(row);
  }

  /**
   * Ürün listesi kısa süreli önbelleklenir (her istek 4 toplama sorgusu çalıştırır). Anahtar, doğrulanmış
   * sorgunun normalize hali + namespace sürümüdür; ürün/kategori yazımlarında sürüm artırılır. Stok
   * düşüşleri TTL içinde yansır (ürün detayı, sepet ve sipariş stoğu her zaman canlı kontrol eder).
   */
  async listProducts(query: ProductListQuery) {
    const { cache } = loadConfig();
    const version = await namespaceVersion(CacheNamespaces.products);
    const normalized = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? [...v].sort().join(',') : v}`)
      .sort()
      .join('&');
    return cached(`products:v${version}:${normalized}`, cache.productListTtlSeconds, async () => {
      const [{ rows, total }, facets] = await Promise.all([this.repo.listProducts(query), this.repo.facets(query)]);
      return { ...paginate(rows.map(toProductListItem), total, query.page, query.limit), facets };
    });
  }

  /** Katalog verisi değiştiğinde (ürün, kategori, koleksiyon) tüm liste önbelleklerini geçersiz kılar. */
  static invalidateLists() {
    return bumpNamespace(CacheNamespaces.products);
  }

  async getProduct(slug: string): Promise<ProductDetailDto> {
    const row = await this.repo.findProductBySlug(slug);
    if (!row) throw AppError.notFound('Ürün bulunamadı.');
    const [images, variantRows, collections] = await Promise.all([
      this.repo.listImages(row.id),
      this.repo.listVariants(row.id),
      this.repo.listProductCollections(row.id),
    ]);
    const variants = variantRows.map(toVariant);
    const cheapest = variants.reduce<(typeof variants)[number] | undefined>(
      (min, v) => (!min || v.price < min.price ? v : min),
      undefined,
    );
    const price = cheapest?.price ?? 0;
    const oldPrice = cheapest?.oldPrice ?? null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      skuBase: row.sku_base,
      category: { name: row.category_name, slug: row.category_slug },
      description: row.description,
      material: row.material,
      pileHeight: row.pile_height,
      origin: row.origin,
      color: row.color,
      care: row.care,
      price,
      oldPrice,
      discountRate: discountRate(price, oldPrice),
      inStock: variants.some((v) => v.inStock),
      isFeatured: Boolean(row.is_featured),
      images: images.map((i: any) => ({ url: i.url, alt: i.alt })),
      variants,
      collections,
    };
  }

  getHome() {
    const config = loadConfig();
    return cached(CacheKeys.home, config.cache.homeTtlSeconds, async () => {
      const [announcements, banners, stories, collections, newArrivals, featured] = await Promise.all([
        this.repo.listAnnouncements(),
        this.repo.listBanners(),
        this.repo.listCategories(true),
        this.repo.listCollections(true),
        this.repo.listProducts({ sort: 'newest', page: 1, limit: 8 }),
        this.repo.listProducts({ sort: 'recommended', featured: true, page: 1, limit: 8 }),
      ]);
      return {
        brand: config.brand,
        announcements: announcements.map((a: any) => ({ id: a.id, placement: a.placement, text: a.text, url: a.url })),
        banners: banners.map((b: any) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          imageUrl: b.image_url,
          mobileImageUrl: b.mobile_image_url,
          ctaText: b.cta_text,
          ctaUrl: b.cta_url,
        })),
        storyCategories: stories.map(toCategory),
        featuredCollections: collections.map(toCollection),
        newArrivals: newArrivals.rows.map(toProductListItem),
        featuredProducts: featured.rows.map(toProductListItem),
        commerce: {
          currency: config.commerce.currency,
          freeShippingThreshold: config.commerce.freeShippingThreshold,
          installments: config.commerce.installments,
        },
      };
    });
  }
}
