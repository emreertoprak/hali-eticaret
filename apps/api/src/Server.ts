import { loadConfig } from '@/config/Config';
import { closeDb } from '@/infra/db';
import { getLogger } from '@/infra/logger';
import { closeRedis, getRedis } from '@/infra/redis';
import { PaymentService } from '@/modules/payments/payments.service';

import { createApp } from './App';

const logger = getLogger('server');
const config = loadConfig();
const server = createApp().listen(config.port, () => {
  logger.info(`API http://localhost:${config.port} adresinde çalışıyor (${config.env}). Doküman: /docs`);
});

/** Ödeme süresi dolan siparişleri dakikada bir iptal eder; çoklu instance'ta Redis kilidiyle tek çalışır. */
const payments = new PaymentService();
const expiryTimer = setInterval(async () => {
  try {
    const locked = await getRedis().set('jobs:expire-unpaid-orders', String(process.pid), 'EX', 55, 'NX');
    if (locked) await payments.expireUnpaidOrders();
  } catch (err) {
    logger.warn(`Süre aşımı işi çalışmadı: ${(err as Error).message}`);
  }
}, 60_000);
expiryTimer.unref();

async function shutdown(signal: string) {
  logger.info(`${signal} alındı, kapatılıyor...`);
  clearInterval(expiryTimer);
  server.close(async () => {
    await Promise.allSettled([closeDb(), closeRedis()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', reason));
