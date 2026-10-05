import { getLogger } from '@/infra/logger';
import { getRedis } from '@/infra/redis';

const logger = getLogger('cache');

/** Redis üzerinde basit read-through cache. Redis erişilemezse doğrudan loader çalışır. */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  try {
    const hit = await getRedis().get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn(`Cache okunamadı (${key}): ${(err as Error).message}`);
  }
  const value = await loader();
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`Cache yazılamadı (${key}): ${(err as Error).message}`);
  }
  return value;
}

export async function invalidate(...patterns: string[]): Promise<void> {
  try {
    const redis = getRedis();
    const prefix = redis.options.keyPrefix ?? '';
    for (const pattern of patterns) {
      const keys = await redis.keys(`${prefix}${pattern}`);
      if (keys.length) await redis.del(...keys.map((k) => k.slice(prefix.length)));
    }
  } catch (err) {
    logger.warn(`Cache temizlenemedi: ${(err as Error).message}`);
  }
}

export const CacheKeys = {
  home: 'home',
  categories: 'categories:list',
  collections: 'collections:list',
} as const;
