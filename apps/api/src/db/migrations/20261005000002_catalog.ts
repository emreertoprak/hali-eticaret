import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('categories', (t) => {
    t.increments('id').primary();
    t.integer('parent_id').unsigned().nullable().references('categories.id').onDelete('SET NULL');
    t.string('name', 120).notNullable();
    t.string('slug', 140).notNullable().unique();
    t.text('description').nullable();
    t.string('image_url', 500).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('show_in_stories').notNullable().defaultTo(true);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('collections', (t) => {
    t.increments('id').primary();
    t.string('name', 120).notNullable();
    t.string('slug', 140).notNullable().unique();
    t.text('description').nullable();
    t.string('image_url', 500).nullable();
    t.string('banner_url', 500).nullable();
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('products', (t) => {
    t.increments('id').primary();
    t.integer('category_id').unsigned().notNullable().references('categories.id').onDelete('RESTRICT');
    t.string('name', 200).notNullable();
    t.string('slug', 220).notNullable().unique();
    t.string('sku_base', 60).notNullable().unique();
    t.text('description').nullable();
    t.string('material', 120).nullable();
    t.string('pile_height', 40).nullable();
    t.string('origin', 60).nullable();
    t.string('color', 60).nullable();
    t.text('care').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['category_id', 'is_active']);
  });
  await knex.raw('ALTER TABLE products ADD FULLTEXT INDEX products_search_ft (name, description)');

  await knex.schema.createTable('product_images', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().references('products.id').onDelete('CASCADE');
    t.string('url', 500).notNullable();
    t.string('alt', 200).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.index(['product_id', 'sort_order']);
  });

  await knex.schema.createTable('product_variants', (t) => {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable().references('products.id').onDelete('CASCADE');
    t.string('sku', 80).notNullable().unique();
    t.string('size_label', 40).notNullable();
    t.integer('width_cm').unsigned().notNullable();
    t.integer('length_cm').unsigned().notNullable();
    t.decimal('price', 12, 2).notNullable();
    t.decimal('discount_price', 12, 2).nullable();
    t.integer('stock').unsigned().notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(['product_id', 'is_active']);
    t.index(['size_label']);
  });

  await knex.schema.createTable('product_collections', (t) => {
    t.integer('product_id').unsigned().notNullable().references('products.id').onDelete('CASCADE');
    t.integer('collection_id').unsigned().notNullable().references('collections.id').onDelete('CASCADE');
    t.primary(['product_id', 'collection_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('product_collections');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('product_images');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('collections');
  await knex.schema.dropTableIfExists('categories');
}
