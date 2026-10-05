import knex from 'knex';

import { loadConfig } from '../src/config/Config';
import { buildKnexConfig } from '../src/infra/db';

/** Test veritabanını sıfırdan migrate edip seed'ler. */
export default async function globalSetup(): Promise<void> {
  process.env.HALI_API_CONFIG_PATH = './config/settings.test.json';
  const db = knex(buildKnexConfig(loadConfig()));
  try {
    await db.migrate.rollback(undefined, true);
    await db.migrate.latest();
    await db.seed.run();
  } finally {
    await db.destroy();
  }
}
