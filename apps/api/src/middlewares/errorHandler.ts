import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { getLogger } from '@/infra/logger';
import { AppError } from '@/utils/AppError';

const logger = getLogger('http');

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`${req.method} ${req.path} bulunamadı.`));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz istek.', details: err.flatten() } });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Geçersiz JSON gövdesi.' } });
    return;
  }
  logger.error(`${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu.' } });
}
