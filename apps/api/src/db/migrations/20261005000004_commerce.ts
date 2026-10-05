import type { Knex } from 'knex';

export const ORDER_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('carts', (t) => {
    t.increments('id').primary();
    t.string('token', 36).notNullable().unique();
    t.integer('user_id').unsigned().nullable().unique().references('users.id').onDelete('CASCADE');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('cart_items', (t) => {
    t.increments('id').primary();
    t.integer('cart_id').unsigned().notNullable().references('carts.id').onDelete('CASCADE');
    t.integer('variant_id').unsigned().notNullable().references('product_variants.id').onDelete('CASCADE');
    t.integer('quantity').unsigned().notNullable();
    t.timestamps(true, true);
    t.unique(['cart_id', 'variant_id']);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.string('order_no', 20).notNullable().unique();
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('RESTRICT');
    t.enum('status', [...ORDER_STATUSES]).notNullable().defaultTo('pending_payment');
    t.enum('payment_method', ['card', 'bank_transfer']).notNullable();
    t.enum('payment_status', ['pending', 'paid', 'failed', 'refunded']).notNullable().defaultTo('pending');
    t.integer('installment_count').unsigned().notNullable().defaultTo(1);
    t.decimal('subtotal', 12, 2).notNullable();
    t.decimal('shipping_fee', 12, 2).notNullable();
    t.decimal('total', 12, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('TRY');
    t.json('shipping_address').notNullable();
    t.string('note', 500).nullable();
    t.timestamps(true, true);
    t.index(['user_id', 'created_at']);
    t.index(['status']);
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    t.integer('product_id').unsigned().nullable().references('products.id').onDelete('SET NULL');
    t.integer('variant_id').unsigned().nullable().references('product_variants.id').onDelete('SET NULL');
    t.string('product_name', 200).notNullable();
    t.string('product_slug', 220).notNullable();
    t.string('image_url', 500).nullable();
    t.string('sku', 80).notNullable();
    t.string('size_label', 40).notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.integer('quantity').unsigned().notNullable();
    t.decimal('line_total', 12, 2).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
}
