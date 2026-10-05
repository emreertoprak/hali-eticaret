import type { NextFunction, Request, Response } from 'express';

const TOKEN_PATTERN = /^[0-9a-f-]{36}$/i;

/** Misafir sepeti için X-Cart-Token başlığını okur. */
export function cartToken(req: Request, _res: Response, next: NextFunction): void {
  const token = req.header('x-cart-token');
  req.cartToken = token && TOKEN_PATTERN.test(token) ? token : undefined;
  next();
}
