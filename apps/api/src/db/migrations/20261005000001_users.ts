import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('email', 191).notNullable().unique();
    t.string('password_hash', 100).notNullable();
    t.string('first_name', 80).notNullable();
    t.string('last_name', 80).notNullable();
    t.string('phone', 20).nullable();
    t.enum('role', ['customer', 'admin']).notNullable().defaultTo('customer');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('addresses', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.string('title', 60).notNullable();
    t.string('full_name', 160).notNullable();
    t.string('phone', 20).notNullable();
    t.string('city', 60).notNullable();
    t.string('district', 60).notNullable();
    t.string('address_line', 500).notNullable();
    t.string('postal_code', 10).nullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('addresses');
  await knex.schema.dropTableIfExists('users');
}
