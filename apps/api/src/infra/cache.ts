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

/** Belirli anahtarları siler. (KEYS taraması kullanılmaz: büyük Redis'te sunucuyu bloklar.) */
export async function invalidate(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    await getRedis().del(...keys);
  } catch (err) {
    logger.warn(`Cache temizlenemedi: ${(err as Error).message}`);
  }
}

/**
 * Sürümlü namespace: anahtar sayısı belirsiz önbellekler (ör. her filtre kombinasyonu) için
 * geçersiz kılma O(1) bir INCR'dir; eski sürümün anahtarları TTL ile kendiliğinden düşer.
 */
export async function namespaceVersion(ns: string): Promise<string> {
  try {
    return (await getRedis().get(`ver:${ns}`)) ?? '0';
  } catch {
    return 'x';
  }
}

export async function bumpNamespace(...namespaces: string[]): Promise<void> {
  try {
    await Promise.all(namespaces.map((ns) => getRedis().incr(`ver:${ns}`)));
  } catch (err) {
    logger.warn(`Cache sürümü artırılamadı: ${(err as Error).message}`);
  }
}

export const CacheKeys = {
  home: 'home',
  categories: 'categories:list',
  collections: 'collections:list',
} as const;

export const CacheNamespaces = { products: 'products' } as const;
