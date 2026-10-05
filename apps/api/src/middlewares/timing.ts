import type { NextFunction, Request, Response } from 'express';

import { loadConfig } from '@/config/Config';
import { getLogger } from '@/infra/logger';

const logger = getLogger('perf');

/** Her yanıta Server-Timing başlığı ekler ve eşiği aşan istekleri loglar (p95 izleme için). */
export function timing(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const writeHead = res.writeHead;
  res.writeHead = function patched(this: Response, ...args: Parameters<Response['writeHead']>) {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (!res.headersSent) res.setHeader('Server-Timing', `app;dur=${ms.toFixed(1)}`);
    return writeHead.apply(this, args);
  } as Response['writeHead'];
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (ms > loadConfig().security.slowRequestMs) logger.warn(`Yavaş istek ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
}
