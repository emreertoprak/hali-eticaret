import rateLimit, { type Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { loadConfig } from '@/config/Config';
import { getRedis } from '@/infra/redis';

function buildStore(prefix: string): Options['store'] | undefined {
  if (loadConfig().rateLimit.store !== 'redis') return undefined;
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (command: string, ...args: string[]) =>
      getRedis().call(command, ...args) as Promise<number>,
  });
}

const message = { error: { code: 'RATE_LIMITED', message: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' } };

export function generalLimiter() {
  const { windowMs, max } = loadConfig().rateLimit;
  return rateLimit({ windowMs, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, message, store: buildStore('general') });
}

export function authLimiter() {
  const { windowMs, authMax } = loadConfig().rateLimit;
  return rateLimit({ windowMs, limit: authMax, standardHeaders: 'draft-7', legacyHeaders: false, message, store: buildStore('auth') });
}
