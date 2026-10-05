import type { Knex } from 'knex';

import { loadConfig } from './src/config/Config';
import { buildKnexConfig } from './src/infra/db';

const config: Knex.Config = buildKnexConfig(loadConfig());

export default config;
module.exports = config;
