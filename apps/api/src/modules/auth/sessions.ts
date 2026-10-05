import { randomUUID } from 'node:crypto';

import { getRedis } from '@/infra/redis';

/**
 * Refresh token oturumları (Redis). Her refresh token tek kullanımlıktır (rotasyon):
 * kullanıldığında silinir ve yenisi verilir. Silinmiş bir token tekrar gelirse token çalınmış
 * kabul edilir ve kullanıcının tüm oturumları kapatılır.
 */
const tokenKey = (jti: string) => `rt:${jti}`;
const userKey = (userId: number) => `rtu:${userId}`;

export class SessionStore {
  newId(): string {
    return randomUUID();
  }

  async save(jti: string, userId: number, ttlSeconds: number): Promise<void> {
    await getRedis()
      .multi()
      .set(tokenKey(jti), String(userId), 'EX', ttlSeconds)
      .sadd(userKey(userId), jti)
      .expire(userKey(userId), ttlSeconds)
      .exec();
  }

  /** Token'ı atomik olarak tüketir; daha önce kullanılmış/iptal edilmişse false döner. */
  async consume(jti: string, userId: number): Promise<boolean> {
    const result = await getRedis().multi().get(tokenKey(jti)).del(tokenKey(jti)).srem(userKey(userId), jti).exec();
    const stored = result?.[0]?.[1];
    return stored === String(userId);
  }

  async revoke(jti: string, userId: number): Promise<void> {
    await getRedis().multi().del(tokenKey(jti)).srem(userKey(userId), jti).exec();
  }

  async revokeAll(userId: number): Promise<void> {
    const redis = getRedis();
    const jtis = await redis.smembers(userKey(userId));
    const tx = redis.multi();
    for (const jti of jtis) tx.del(tokenKey(jti));
    tx.del(userKey(userId));
    await tx.exec();
  }
}
