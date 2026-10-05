import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (t) => {
    // Yalnızca Google ile kayıt olan kullanıcıların şifresi yoktur.
    t.string('password_hash', 100).nullable().alter();
    t.string('google_sub', 64).nullable().unique();
    t.string('avatar_url', 500).nullable();
    t.timestamp('email_verified_at').nullable();
    t.timestamp('password_changed_at').nullable();
  });

  await knex.schema.createTable('password_resets', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    // Token'ın kendisi değil SHA-256 özeti saklanır; veritabanı sızsa bile token kullanılamaz.
    t.string('token_hash', 64).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.timestamp('used_at').nullable();
    t.string('requested_ip', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_resets');
  await knex('users').whereNull('password_hash').update({ password_hash: '!' });
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('google_sub');
    t.dropColumn('avatar_url');
    t.dropColumn('email_verified_at');
    t.dropColumn('password_changed_at');
    t.string('password_hash', 100).notNullable().alter();
  });
}
