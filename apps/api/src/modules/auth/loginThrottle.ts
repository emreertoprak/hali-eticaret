import { loadConfig } from '@/config/Config';
import { getRedis } from '@/infra/redis';

/** E-posta bazlı hatalı giriş sayacı (IP bazlı rate limit'e ek: dağıtık brute-force'a karşı). */
const key = (email: string) => `lf:${email.toLowerCase()}`;

export class LoginThrottle {
  /** Hesap kilitliyse kalan saniyeyi, değilse 0 döner. */
  async lockedFor(email: string): Promise<number> {
    const { loginMaxAttempts } = loadConfig().security;
    const [count, ttl] = await Promise.all([getRedis().get(key(email)), getRedis().ttl(key(email))]);
    return Number(count ?? 0) >= loginMaxAttempts ? Math.max(ttl, 1) : 0;
  }

  async fail(email: string): Promise<void> {
    const { loginLockMinutes } = loadConfig().security;
    const n = await getRedis().incr(key(email));
    if (n === 1) await getRedis().expire(key(email), loginLockMinutes * 60);
  }

  async reset(email: string): Promise<void> {
    await getRedis().del(key(email));
  }
}
