import type { Knex } from 'knex';

/** Siparişteki kalemlerin stoklarını iade eder (iptal / ödeme süresi aşımı). */
export async function restoreStock(trx: Knex.Transaction, orderId: number): Promise<void> {
  const items = await trx('order_items').where({ order_id: orderId }).whereNotNull('variant_id');
  for (const item of items) {
    await trx('product_variants').where({ id: item.variant_id }).increment('stock', item.quantity);
  }
}
