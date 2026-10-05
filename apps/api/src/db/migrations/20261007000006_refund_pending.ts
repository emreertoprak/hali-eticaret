import type { Knex } from 'knex';

/** İptal edilen ödenmiş siparişler için "iade bekliyor" durumu (iade ödeme sağlayıcısında elle yapılır). */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    "ALTER TABLE orders MODIFY payment_status ENUM('pending','paid','failed','refund_pending','refunded') NOT NULL DEFAULT 'pending'",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex('orders').where({ payment_status: 'refund_pending' }).update({ payment_status: 'paid' });
  await knex.raw("ALTER TABLE orders MODIFY payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending'");
}
