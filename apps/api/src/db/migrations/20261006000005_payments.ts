import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('payments', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    t.enum('provider', ['mock', 'paytr']).notNullable();
    // PayTR merchant_oid yalnızca alfanumerik olabilir ve her deneme için benzersiz olmalı.
    t.string('merchant_oid', 64).notNullable().unique();
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('TRY');
    t.enum('status', ['initiated', 'succeeded', 'failed']).notNullable().defaultTo('initiated');
    t.integer('installment_count').unsigned().nullable();
    t.string('payment_type', 30).nullable();
    t.string('failed_reason_code', 20).nullable();
    t.string('failed_reason_msg', 255).nullable();
    t.json('callback_payload').nullable();
    t.timestamps(true, true);
    t.index(['order_id']);
  });

  await knex.schema.alterTable('orders', (t) => {
    t.timestamp('payment_expires_at').nullable();
    t.timestamp('paid_at').nullable();
    t.string('carrier', 60).nullable();
    t.string('tracking_number', 80).nullable();
    t.index(['status', 'payment_expires_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (t) => {
    t.dropIndex(['status', 'payment_expires_at']);
    t.dropColumn('payment_expires_at');
    t.dropColumn('paid_at');
    t.dropColumn('carrier');
    t.dropColumn('tracking_number');
  });
  await knex.schema.dropTableIfExists('payments');
}
