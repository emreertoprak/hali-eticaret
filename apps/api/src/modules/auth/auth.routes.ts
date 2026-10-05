import { Router } from 'express';

import { requireAuth } from '@/middlewares/auth';
import { authLimiter } from '@/middlewares/rateLimiter';
import { validate } from '@/middlewares/validate';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import { authResponse, loginBody, refreshBody, registerBody, userSchema } from './auth.schemas';
import { AuthService } from './auth.service';

export function authRouter(service = new AuthService()): Router {
  const router = Router();
  const tags = ['Üyelik'];
  const limiter = authLimiter();

  doc('post', '/auth/register', { tags, summary: 'Üye ol', body: registerBody, response: authResponse, status: 201 });
  router.post(
    '/auth/register',
    limiter,
    validate({ body: registerBody }),
    asyncHandler(async (req, res) => res.status(201).json(await service.register(req.body))),
  );

  doc('post', '/auth/login', { tags, summary: 'Giriş yap', body: loginBody, response: authResponse });
  router.post(
    '/auth/login',
    limiter,
    validate({ body: loginBody }),
    asyncHandler(async (req, res) => res.json(await service.login(req.body))),
  );

  doc('post', '/auth/refresh', { tags, summary: 'Access token yenile', body: refreshBody, response: authResponse });
  router.post(
    '/auth/refresh',
    limiter,
    validate({ body: refreshBody }),
    asyncHandler(async (req, res) => res.json(await service.refresh(req.body.refreshToken))),
  );

  doc('get', '/auth/me', { tags, summary: 'Oturumdaki kullanıcı', auth: true, response: userSchema });
  router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => res.json(await service.me(req.user!.id))));

  return router;
}
