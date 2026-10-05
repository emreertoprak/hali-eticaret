import type { Knex } from 'knex';

import { CacheKeys, invalidate } from '@/infra/cache';
import { getDb } from '@/infra/db';
import { toOrder } from '@/modules/orders/orders.service';
import { AppError } from '@/utils/AppError';
import { paginate } from '@/utils/pagination';
import { slugify } from '@/utils/slugify';

import type { ProductInput } from './admin.schemas';

const toSnake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (key: string) => key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());

export function snakeKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [toSnake(k), v]));
}

const BOOLEAN_COLUMN = /^(is|show)_/;

export function camelKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [toCamel(k), BOOLEAN_COLUMN.test(k) && typeof v === 'number' ? v === 1 : v]),
  );
}

const TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/** Basit içerik tabloları (kategori, koleksiyon, banner, duyuru) için CRUD. */
export class SimpleCrud {
  constructor(
    private readonly table: string,
    private readonly label: string,
    private readonly hasSlug: boolean,
    private readonly db: () => Knex = getDb,
  ) {}

  private async invalidateCaches() {
    await invalidate(CacheKeys.home, CacheKeys.categories, CacheKeys.collections);
  }

  async list() {
    const rows = await this.db()(this.table).orderBy([{ column: 'sort_order' }, { column: 'id' }]);
    return rows.map(camelKeys);
  }

  async get(id: number) {
    const row = await this.db()(this.table).where({ id }).first();
    if (!row) throw AppError.notFound(`${this.label} bulunamadı.`);
    return camelKeys(row);
  }

  private withSlug(input: Record<string, any>) {
    if (!this.hasSlug) return input;
    return { ...input, slug: input.slug ?? slugify(input.name) };
  }

  async create(input: Record<string, any>) {
    try {
      const [id] = await this.db()(this.table).insert(snakeKeys(this.withSlug(input)));
      await this.invalidateCaches();
      return this.get(id);
    } catch (err) {
      throw mapDbError(err, this.label);
    }
  }

  async update(id: number, input: Record<string, any>) {
    await this.get(id);
    try {
      await this.db()(this.table).where({ id }).update({ ...snakeKeys(this.withSlug(input)), updated_at: this.db().fn.now() });
    } catch (err) {
      throw mapDbError(err, this.label);
    }
    await this.invalidateCaches();
    return this.get(id);
  }

  async remove(id: number) {
    try {
      const deleted = await this.db()(this.table).where({ id }).delete();
      if (!deleted) throw AppError.notFound(`${this.label} bulunamadı.`);
    } catch (err) {
      throw mapDbError(err, this.label);
    }
    await this.invalidateCaches();
  }
}

export function mapDbError(err: unknown, label: string): unknown {
  const code = (err as { code?: string })?.code;
  if (code === 'ER_DUP_ENTRY') return AppError.conflict(`${label} için benzersiz alan (slug/SKU) zaten kullanılıyor.`);
  if (code === 'ER_ROW_IS_REFERENCED_2') return AppError.conflict(`${label} başka kayıtlar tarafından kullanıldığı için silinemez.`);
  if (code === 'ER_NO_REFERENCED_ROW_2') return AppError.badRequest('İlişkili kayıt bulunamadı.');
  return err;
}

export class AdminProductService {
  constructor(private readonly db: () => Knex = getDb) {}

  async list(page: number, limit: number, q?: string) {
    const base = this.db()('products as p')
      .join('categories as c', 'c.id', 'p.category_id')
      .modify((qb) => {
        if (q) qb.where((w) => w.where('p.name', 'like', `%${q}%`).orWhere('p.sku_base', 'like', `%${q}%`));
      });
    const [{ total }] = await base.clone().count({ total: 'p.id' });
    const rows = await base
      .clone()
      .select('p.*', 'c.name as category_name')
      .orderBy('p.id', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    return paginate(rows.map(camelKeys), Number(total), page, limit);
  }

  async get(id: number) {
    const product = await this.db()('products').where({ id }).first();
    if (!product) throw AppError.notFound('Ürün bulunamadı.');
    const [images, variants, collections] = await Promise.all([
      this.db()('product_images').where({ product_id: id }).orderBy('sort_order'),
      this.db()('product_variants').where({ product_id: id }).orderByRaw('width_cm * length_cm'),
      this.db()('product_collections').where({ product_id: id }).pluck('collection_id'),
    ]);
    return {
      ...camelKeys(product),
      images: images.map(camelKeys),
      variants: variants.map(camelKeys),
      collectionIds: collections,
    };
  }

  private async write(trx: Knex.Transaction, productId: number, input: ProductInput) {
    await trx('product_images').where({ product_id: productId }).delete();
    if (input.images.length) {
      await trx('product_images').insert(
        input.images.map((img, i) => ({ product_id: productId, url: img.url, alt: img.alt ?? input.name, sort_order: i })),
      );
    }

    // Var olan varyantlar güncellenir (sipariş geçmişindeki referanslar korunur), listede olmayanlar pasife alınır.
    const keepIds: number[] = [];
    for (const v of input.variants) {
      const row = {
        sku: v.sku,
        size_label: v.sizeLabel ?? `${v.widthCm}x${v.lengthCm}`,
        width_cm: v.widthCm,
        length_cm: v.lengthCm,
        price: v.price,
        discount_price: v.discountPrice ?? null,
        stock: v.stock,
        is_active: v.isActive,
      };
      if (v.id) {
        const updated = await trx('product_variants').where({ id: v.id, product_id: productId }).update(row);
        if (!updated) throw AppError.badRequest(`Varyant #${v.id} bu ürüne ait değil.`);
        keepIds.push(v.id);
      } else {
        const [newId] = await trx('product_variants').insert({ ...row, product_id: productId });
        keepIds.push(newId);
      }
    }
    await trx('product_variants').where({ product_id: productId }).whereNotIn('id', keepIds).update({ is_active: false });

    await trx('product_collections').where({ product_id: productId }).delete();
    if (input.collectionIds.length) {
      await trx('product_collections').insert(input.collectionIds.map((cid) => ({ product_id: productId, collection_id: cid })));
    }
  }

  private productRow(input: ProductInput) {
    const { images: _i, variants: _v, collectionIds: _c, ...rest } = input;
    return snakeKeys({ ...rest, slug: input.slug ?? slugify(input.name) });
  }

  async create(input: ProductInput) {
    try {
      const id = await this.db().transaction(async (trx) => {
        const [newId] = await trx('products').insert(this.productRow(input));
        await this.write(trx, newId, input);
        return newId;
      });
      await invalidate(CacheKeys.home, CacheKeys.categories);
      return this.get(id);
    } catch (err) {
      throw mapDbError(err, 'Ürün');
    }
  }

  async update(id: number, input: ProductInput) {
    await this.get(id);
    try {
      await this.db().transaction(async (trx) => {
        await trx('products').where({ id }).update({ ...this.productRow(input), updated_at: trx.fn.now() });
        await this.write(trx, id, input);
      });
    } catch (err) {
      throw mapDbError(err, 'Ürün');
    }
    await invalidate(CacheKeys.home, CacheKeys.categories);
    return this.get(id);
  }

  /** Sipariş geçmişini bozmamak için ürünler silinmez, pasife alınır. */
  async deactivate(id: number) {
    const updated = await this.db()('products').where({ id }).update({ is_active: false, updated_at: this.db().fn.now() });
    if (!updated) throw AppError.notFound('Ürün bulunamadı.');
    await invalidate(CacheKeys.home, CacheKeys.categories);
  }
}

export class AdminOrderService {
  constructor(private readonly db: () => Knex = getDb) {}

  async list(page: number, limit: number, status?: string) {
    const base = this.db()('orders').modify((qb) => {
      if (status) qb.where({ status });
    });
    const [{ total }] = await base.clone().count({ total: '*' });
    const orders = await base.clone().orderBy('id', 'desc').limit(limit).offset((page - 1) * limit);
    const items = orders.length ? await this.db()('order_items').whereIn('order_id', orders.map((o: any) => o.id)) : [];
    return paginate(
      orders.map((o: any) => ({ id: o.id, userId: o.user_id, ...toOrder(o, items.filter((i: any) => i.order_id === o.id)) })),
      Number(total),
      page,
      limit,
    );
  }

  async updateStatus(id: number, status: string) {
    return this.db().transaction(async (trx) => {
      const order = await trx('orders').where({ id }).forUpdate().first();
      if (!order) throw AppError.notFound('Sipariş bulunamadı.');
      if (!TRANSITIONS[order.status]?.includes(status)) {
        throw AppError.conflict(`Sipariş durumu "${order.status}" → "${status}" olarak değiştirilemez.`);
      }
      const patch: Record<string, unknown> = { status, updated_at: trx.fn.now() };
      if (status === 'confirmed' && order.payment_status === 'pending') patch.payment_status = 'paid';
      if (status === 'cancelled') {
        // İptalde stok iade edilir.
        const items = await trx('order_items').where({ order_id: id }).whereNotNull('variant_id');
        for (const item of items) {
          await trx('product_variants').where({ id: item.variant_id }).increment('stock', item.quantity);
        }
        if (order.payment_status === 'paid') patch.payment_status = 'refunded';
      }
      await trx('orders').where({ id }).update(patch);
      const updated = await trx('orders').where({ id }).first();
      const items = await trx('order_items').where({ order_id: id });
      return { id, userId: updated.user_id, ...toOrder(updated, items) };
    });
  }
}
