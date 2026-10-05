import type { Knex } from 'knex';

import { getDb } from '@/infra/db';

import type { ProductListQuery } from './catalog.schemas';

/** Varyant fiyatı: indirimli fiyat varsa o, yoksa liste fiyatı. */
export const EFFECTIVE_PRICE = 'COALESCE(v.discount_price, v.price)';

export interface ProductRow {
  id: number;
  name: string;
  slug: string;
  is_featured: number;
  category_name: string;
  category_slug: string;
  min_price: number;
  min_price_old: number | null;
  sizes: string | null;
  total_stock: number;
  image_url: string | null;
  hover_image_url: string | null;
}

export class CatalogRepository {
  constructor(private readonly db: () => Knex = getDb) {}

  listCategories(onlyStories = false) {
    return this.db()('categories as c')
      .leftJoin('products as p', function joinActive() {
        this.on('p.category_id', 'c.id').andOn('p.is_active', '=', 1 as never);
      })
      .where('c.is_active', true)
      .modify((qb) => {
        if (onlyStories) qb.andWhere('c.show_in_stories', true);
      })
      .groupBy('c.id')
      .orderBy([{ column: 'c.sort_order' }, { column: 'c.name' }])
      .select('c.id', 'c.parent_id', 'c.name', 'c.slug', 'c.description', 'c.image_url')
      .count({ product_count: 'p.id' });
  }

  findCategoryBySlug(slug: string) {
    return this.db()('categories').where({ slug, is_active: true }).first();
  }

  listCollections(onlyFeatured = false) {
    return this.db()('collections')
      .where('is_active', true)
      .modify((qb) => {
        if (onlyFeatured) qb.andWhere('is_featured', true);
      })
      .orderBy([{ column: 'sort_order' }, { column: 'name' }]);
  }

  findCollectionBySlug(slug: string) {
    return this.db()('collections').where({ slug, is_active: true }).first();
  }

  /** Aktif varyant özetini (min fiyat, ebatlar, stok) ürün başına hesaplayan alt sorgu. */
  private variantSummary() {
    const db = this.db();
    return db('product_variants as v')
      .where('v.is_active', true)
      .groupBy('v.product_id')
      .select(
        'v.product_id',
        db.raw(`MIN(${EFFECTIVE_PRICE}) as min_price`),
        // En ucuz (efektif fiyatlı) varyantın liste fiyatı; indirim yoksa min_price ile aynıdır.
        db.raw(
          `CAST(SUBSTRING_INDEX(GROUP_CONCAT(v.price ORDER BY ${EFFECTIVE_PRICE} ASC, v.price ASC SEPARATOR ','), ',', 1) AS DECIMAL(12,2)) as min_price_old`,
        ),
        db.raw('GROUP_CONCAT(v.size_label ORDER BY v.width_cm * v.length_cm SEPARATOR ",") as sizes'),
        db.raw('SUM(v.stock) as total_stock'),
      );
  }

  private imageAt(position: number) {
    const db = this.db();
    return db('product_images as pi')
      .select('pi.url')
      .whereRaw('pi.product_id = p.id')
      .orderBy([{ column: 'pi.sort_order' }, { column: 'pi.id' }])
      .limit(1)
      .offset(position);
  }

  private filteredProducts(query: Omit<ProductListQuery, 'sort' | 'page' | 'limit'>, ignoreSize = false) {
    const db = this.db();
    const qb = db('products as p')
      .join('categories as c', 'c.id', 'p.category_id')
      .join(this.variantSummary().as('vs'), 'vs.product_id', 'p.id')
      .where('p.is_active', true);

    if (query.category) qb.andWhere('c.slug', query.category);
    if (query.collection) {
      qb.whereExists(
        db('product_collections as pc')
          .join('collections as col', 'col.id', 'pc.collection_id')
          .whereRaw('pc.product_id = p.id')
          .andWhere('col.slug', query.collection),
      );
    }
    if (query.q) {
      const like = `%${query.q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere((w) => w.where('p.name', 'like', like).orWhere('p.description', 'like', like).orWhere('c.name', 'like', like));
    }
    if (query.featured !== undefined) qb.andWhere('p.is_featured', query.featured);
    if (query.minPrice !== undefined) qb.andWhere('vs.min_price', '>=', query.minPrice);
    if (query.maxPrice !== undefined) qb.andWhere('vs.min_price', '<=', query.maxPrice);
    if (!ignoreSize && query.size?.length) {
      qb.whereExists(
        db('product_variants as sv')
          .whereRaw('sv.product_id = p.id')
          .andWhere('sv.is_active', true)
          .whereIn('sv.size_label', query.size),
      );
    }
    return qb;
  }

  async listProducts(query: ProductListQuery): Promise<{ rows: ProductRow[]; total: number }> {
    const base = this.filteredProducts(query);
    const [{ total }] = await base.clone().clearSelect().count({ total: 'p.id' });

    const rows = await base
      .clone()
      .select(
        'p.id',
        'p.name',
        'p.slug',
        'p.is_featured',
        'c.name as category_name',
        'c.slug as category_slug',
        'vs.min_price',
        'vs.min_price_old',
        'vs.sizes',
        'vs.total_stock',
        this.imageAt(0).as('image_url'),
        this.imageAt(1).as('hover_image_url'),
      )
      .modify((qb) => {
        switch (query.sort) {
          case 'price_asc':
            qb.orderBy('vs.min_price', 'asc');
            break;
          case 'price_desc':
            qb.orderBy('vs.min_price', 'desc');
            break;
          case 'newest':
            qb.orderBy('p.created_at', 'desc');
            break;
          default:
            qb.orderBy([{ column: 'p.is_featured', order: 'desc' }, { column: 'p.created_at', order: 'desc' }]);
        }
        qb.orderBy('p.id', 'desc');
      })
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return { rows: rows as ProductRow[], total: Number(total) };
  }

  /** Filtre paneli için ebat sayıları ve fiyat aralığı (ebat filtresi hariç diğer filtreler uygulanır). */
  async facets(query: ProductListQuery) {
    const db = this.db();
    const ids = this.filteredProducts(query, true).clearSelect().select('p.id');
    const sizes = await db('product_variants')
      .where('is_active', true)
      .whereIn('product_id', ids.clone())
      .groupBy('size_label')
      .select('size_label')
      .countDistinct({ count: 'product_id' })
      .min({ area: db.raw('width_cm * length_cm') })
      .orderBy('area');
    const [range] = await db('product_variants as v')
      .where('v.is_active', true)
      .whereIn('v.product_id', ids.clone())
      .select(db.raw(`MIN(${EFFECTIVE_PRICE}) as min`), db.raw(`MAX(${EFFECTIVE_PRICE}) as max`));
    return {
      sizes: sizes.map((s: any) => ({ label: s.size_label as string, count: Number(s.count) })),
      priceRange: { min: Number(range?.min ?? 0), max: Number(range?.max ?? 0) },
    };
  }

  findProductBySlug(slug: string) {
    return this.db()('products as p')
      .join('categories as c', 'c.id', 'p.category_id')
      .where({ 'p.slug': slug, 'p.is_active': true })
      .first('p.*', 'c.name as category_name', 'c.slug as category_slug');
  }

  listImages(productId: number) {
    return this.db()('product_images').where('product_id', productId).orderBy([{ column: 'sort_order' }, { column: 'id' }]);
  }

  listVariants(productId: number) {
    return this.db()('product_variants')
      .where({ product_id: productId, is_active: true })
      .orderByRaw('width_cm * length_cm');
  }

  listProductCollections(productId: number) {
    return this.db()('collections as col')
      .join('product_collections as pc', 'pc.collection_id', 'col.id')
      .where({ 'pc.product_id': productId, 'col.is_active': true })
      .select('col.name', 'col.slug');
  }

  listAnnouncements() {
    return this.db()('announcements').where('is_active', true).orderBy([{ column: 'placement' }, { column: 'sort_order' }]);
  }

  listBanners() {
    return this.db()('banners').where('is_active', true).orderBy('sort_order');
  }
}
