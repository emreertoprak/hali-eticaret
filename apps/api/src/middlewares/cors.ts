import type { NextFunction, Request, Response } from 'express';

import { loadConfig } from '@/config/Config';

export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.header('origin');
  if (origin && loadConfig().cors.origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cart-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'X-Cart-Token');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}
