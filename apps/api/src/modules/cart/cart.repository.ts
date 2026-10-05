import type { Knex } from 'knex';

import { getDb } from '@/infra/db';

export interface CartRow {
  id: number;
  token: string;
  user_id: number | null;
}

export interface CartLineRow {
  id: number;
  variant_id: number;
  quantity: number;
  product_id: number;
  name: string;
  slug: string;
  sku: string;
  size_label: string;
  price: number;
  discount_price: number | null;
  stock: number;
  variant_active: number;
  product_active: number;
  image_url: string | null;
}

export class CartRepository {
  constructor(private readonly db: () => Knex = getDb) {}

  findByToken(token: string, trx?: Knex.Transaction): Promise<CartRow | undefined> {
    return (trx ?? this.db())<CartRow>('carts').where({ token }).first();
  }

  findByUser(userId: number, trx?: Knex.Transaction): Promise<CartRow | undefined> {
    return (trx ?? this.db())<CartRow>('carts').where({ user_id: userId }).first();
  }

  async create(token: string, userId: number | null): Promise<CartRow> {
    const [id] = await this.db()('carts').insert({ token, user_id: userId });
    return { id, token, user_id: userId };
  }

  assignUser(cartId: number, userId: number) {
    return this.db()('carts').where({ id: cartId }).update({ user_id: userId, updated_at: this.db().fn.now() });
  }

  deleteCart(cartId: number, trx?: Knex.Transaction) {
    return (trx ?? this.db())('carts').where({ id: cartId }).delete();
  }

  lines(cartId: number, trx?: Knex.Transaction): Promise<CartLineRow[]> {
    const db = trx ?? this.db();
    return db('cart_items as ci')
      .join('product_variants as v', 'v.id', 'ci.variant_id')
      .join('products as p', 'p.id', 'v.product_id')
      .where('ci.cart_id', cartId)
      .orderBy('ci.id')
      .select(
        'ci.id',
        'ci.variant_id',
        'ci.quantity',
        'p.id as product_id',
        'p.name',
        'p.slug',
        'v.sku',
        'v.size_label',
        'v.price',
        'v.discount_price',
        'v.stock',
        'v.is_active as variant_active',
        'p.is_active as product_active',
        db('product_images as pi')
          .select('pi.url')
          .whereRaw('pi.product_id = p.id')
          .orderBy([{ column: 'pi.sort_order' }, { column: 'pi.id' }])
          .limit(1)
          .as('image_url'),
      );
  }

  findVariant(variantId: number) {
    return this.db()('product_variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .where({ 'v.id': variantId, 'v.is_active': true, 'p.is_active': true })
      .first('v.id', 'v.stock');
  }

  findItem(cartId: number, itemId: number) {
    return this.db()('cart_items').where({ cart_id: cartId, id: itemId }).first();
  }

  findItemByVariant(cartId: number, variantId: number, trx?: Knex.Transaction) {
    return (trx ?? this.db())('cart_items').where({ cart_id: cartId, variant_id: variantId }).first();
  }

  insertItem(cartId: number, variantId: number, quantity: number, trx?: Knex.Transaction) {
    return (trx ?? this.db())('cart_items').insert({ cart_id: cartId, variant_id: variantId, quantity });
  }

  updateItemQuantity(itemId: number, quantity: number, trx?: Knex.Transaction) {
    const db = trx ?? this.db();
    return db('cart_items').where({ id: itemId }).update({ quantity, updated_at: db.fn.now() });
  }

  deleteItem(cartId: number, itemId: number) {
    return this.db()('cart_items').where({ cart_id: cartId, id: itemId }).delete();
  }

  clear(cartId: number, trx?: Knex.Transaction) {
    return (trx ?? this.db())('cart_items').where({ cart_id: cartId }).delete();
  }

  transaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.db().transaction(fn);
  }
}
