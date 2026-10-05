import { Router } from 'express';

import { getDb } from '@/infra/db';
import { getRedis } from '@/infra/redis';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

async function check(fn: () => Promise<unknown>): Promise<'up' | 'down'> {
  try {
    await Promise.race([fn(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))]);
    return 'up';
  } catch {
    return 'down';
  }
}

export function healthRouter(): Router {
  const router = Router();
  doc('get', '/health', { tags: ['Sistem'], summary: 'Sağlık kontrolü' });
  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      const [db, redis] = await Promise.all([check(() => getDb().raw('SELECT 1')), check(() => getRedis().ping())]);
      const ok = db === 'up';
      res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db, redis, uptime: Math.round(process.uptime()) });
    }),
  );
  return router;
}
