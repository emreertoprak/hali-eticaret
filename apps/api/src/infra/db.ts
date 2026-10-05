import { join } from 'node:path';

import knex, { type Knex } from 'knex';

import { type AppConfig, loadConfig } from '../config/Config';

export function buildKnexConfig(config: AppConfig): Knex.Config {
  const { db } = config;
  return {
    client: 'mysql2',
    connection: {
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      charset: 'utf8mb4',
      decimalNumbers: true,
      timezone: 'Z',
    },
    pool: db.pool,
    migrations: {
      directory: join(__dirname, '..', 'db', 'migrations'),
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: join(__dirname, '..', 'db', 'seeds'),
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  };
}

let instance: Knex | undefined;

export function getDb(): Knex {
  if (!instance) instance = knex(buildKnexConfig(loadConfig()));
  return instance;
}

export async function closeDb(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = undefined;
  }
}
