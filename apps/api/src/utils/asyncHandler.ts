import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 promise reddini yakalamadığı için async handler'ları sarar. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
