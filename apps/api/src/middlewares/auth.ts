import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { loadConfig } from '@/config/Config';
import type { AuthUser } from '@/types/express';
import { AppError } from '@/utils/AppError';

function readUser(req: Request): AuthUser | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), loadConfig().jwt.accessSecret) as jwt.JwtPayload;
    if (payload.typ !== 'access') return undefined;
    return { id: Number(payload.sub), email: payload.email, role: payload.role };
  } catch {
    throw AppError.unauthorized('Oturum süresi doldu veya geçersiz.');
  }
}

/** Token varsa kullanıcıyı çözer, yoksa isteği misafir olarak geçirir. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    req.user = readUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    req.user = readUser(req);
    if (!req.user) throw AppError.unauthorized();
    next();
  } catch (err) {
    next(err);
  }
}

export const requireRole =
  (role: AuthUser['role']) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.role !== role) return next(AppError.forbidden());
    next();
  };
