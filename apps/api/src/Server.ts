import { loadConfig } from '@/config/Config';
import { closeDb } from '@/infra/db';
import { getLogger } from '@/infra/logger';
import { closeRedis } from '@/infra/redis';

import { createApp } from './App';

const logger = getLogger('server');
const config = loadConfig();
const server = createApp().listen(config.port, () => {
  logger.info(`API http://localhost:${config.port} adresinde çalışıyor (${config.env}). Doküman: /docs`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} alındı, kapatılıyor...`);
  server.close(async () => {
    await Promise.allSettled([closeDb(), closeRedis()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', reason));
