import Redis from 'ioredis';

import { loadConfig } from '@/config/Config';
import { getLogger } from '@/infra/logger';

let client: Redis | undefined;

export function getRedis(): Redis {
  if (!client) {
    const { redis } = loadConfig();
    client = new Redis(redis.url, {
      keyPrefix: redis.keyPrefix,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: true,
    });
    client.on('error', (err) => getLogger('redis').warn(`Redis hatası: ${err.message}`));
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    client.disconnect();
    client = undefined;
  }
}
