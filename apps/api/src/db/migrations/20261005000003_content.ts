import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('banners', (t) => {
    t.increments('id').primary();
    t.string('title', 160).notNullable();
    t.string('subtitle', 255).nullable();
    t.string('image_url', 500).notNullable();
    t.string('mobile_image_url', 500).nullable();
    t.string('cta_text', 60).nullable();
    t.string('cta_url', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('announcements', (t) => {
    t.increments('id').primary();
    t.enum('placement', ['top', 'promo']).notNullable().defaultTo('top');
    t.string('text', 255).notNullable();
    t.string('url', 255).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('announcements');
  await knex.schema.dropTableIfExists('banners');
}
