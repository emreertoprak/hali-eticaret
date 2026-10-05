import { type CookieOptions, type Response, Router } from 'express';

import { loadConfig } from '@/config/Config';
import { requireAuth } from '@/middlewares/auth';
import { authLimiter } from '@/middlewares/rateLimiter';
import { validate } from '@/middlewares/validate';
import { normalizeIp } from '@/modules/payments/payments.service';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';
import { readCookie } from '@/utils/cookies';

import {
  authResponse,
  changePasswordBody,
  forgotPasswordBody,
  googleLoginBody,
  loginBody,
  providersResponse,
  registerBody,
  resetPasswordBody,
  userSchema,
} from './auth.schemas';
import { AuthService, type IssuedSession } from './auth.service';

const COOKIE_PATH = '/api/v1/auth';
/**
 * Gizli olmayan işaret çerezi: yalnızca "bu tarayıcıda oturum var" bilgisini taşır (token değil).
 * Web, oturumu olmayan ziyaretçiler için gereksiz /auth/refresh isteği atmamak için bunu okur.
 */
const HINT_COOKIE = 'he_session';

function cookieOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: loadConfig().auth.cookieSecure,
    sameSite: 'strict',
    path: COOKIE_PATH,
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

/** Refresh token yalnızca httpOnly çerezde taşınır; JS (dolayısıyla XSS) erişemez. */
function hintOptions(maxAgeSeconds?: number): CookieOptions {
  return {
    httpOnly: false,
    secure: loadConfig().auth.cookieSecure,
    sameSite: 'lax',
    path: '/',
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

function clearSession(res: Response) {
  res.clearCookie(loadConfig().auth.refreshCookieName, cookieOptions());
  res.clearCookie(HINT_COOKIE, hintOptions());
}

function sendSession(res: Response, session: IssuedSession, status = 200) {
  res.cookie(loadConfig().auth.refreshCookieName, session.refreshToken, cookieOptions(session.refreshExpiresIn));
  res.cookie(HINT_COOKIE, '1', hintOptions(session.refreshExpiresIn));
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json({ user: session.user, accessToken: session.accessToken, expiresIn: session.expiresIn });
}

export function authRouter(service = new AuthService()): Router {
  const router = Router();
  const tags = ['Üyelik'];
  const limiter = authLimiter();
  const refreshCookie = (req: Parameters<typeof readCookie>[0]) => readCookie(req, loadConfig().auth.refreshCookieName);

  doc('get', '/auth/providers', { tags, summary: 'Etkin giriş yöntemleri', response: providersResponse });
  router.get('/auth/providers', (_req, res) => res.json(service.providers()));

  doc('post', '/auth/register', { tags, summary: 'Üye ol', body: registerBody, response: authResponse, status: 201 });
  router.post(
    '/auth/register',
    limiter,
    validate({ body: registerBody }),
    asyncHandler(async (req, res) => sendSession(res, await service.register(req.body), 201)),
  );

  doc('post', '/auth/login', { tags, summary: 'Giriş yap (hesap bazlı hatalı deneme kilidi)', body: loginBody, response: authResponse });
  router.post(
    '/auth/login',
    limiter,
    validate({ body: loginBody }),
    asyncHandler(async (req, res) => sendSession(res, await service.login(req.body))),
  );

  doc('post', '/auth/google', { tags, summary: 'Google ile giriş / kayıt (Google Identity Services ID token)', body: googleLoginBody, response: authResponse });
  router.post(
    '/auth/google',
    limiter,
    validate({ body: googleLoginBody }),
    asyncHandler(async (req, res) => sendSession(res, await service.loginWithGoogle(req.body.credential))),
  );

  doc('post', '/auth/refresh', { tags, summary: 'Access token yenile (httpOnly refresh çerezi ile, rotasyonlu)', response: authResponse });
  router.post(
    '/auth/refresh',
    asyncHandler(async (req, res) => {
      try {
        sendSession(res, await service.refresh(refreshCookie(req)));
      } catch (err) {
        clearSession(res);
        throw err;
      }
    }),
  );

  doc('post', '/auth/logout', { tags, summary: 'Çıkış yap (bu cihaz)', status: 204 });
  router.post(
    '/auth/logout',
    asyncHandler(async (req, res) => {
      await service.logout(refreshCookie(req));
      clearSession(res);
      res.sendStatus(204);
    }),
  );

  doc('post', '/auth/logout-all', { tags, summary: 'Tüm cihazlardan çıkış', auth: true, status: 204 });
  router.post(
    '/auth/logout-all',
    requireAuth,
    asyncHandler(async (req, res) => {
      await service.logoutAll(req.user!.id);
      clearSession(res);
      res.sendStatus(204);
    }),
  );

  doc('get', '/auth/me', { tags, summary: 'Oturumdaki kullanıcı', auth: true, response: userSchema });
  router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => res.json(await service.me(req.user!.id))));

  doc('post', '/auth/password', { tags, summary: 'Şifre değiştir / belirle (diğer oturumlar kapanır)', auth: true, body: changePasswordBody, response: authResponse });
  router.post(
    '/auth/password',
    requireAuth,
    limiter,
    validate({ body: changePasswordBody }),
    asyncHandler(async (req, res) => sendSession(res, await service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword))),
  );

  doc('post', '/auth/password/forgot', { tags, summary: 'Şifre sıfırlama e-postası iste (her zaman 202)', body: forgotPasswordBody, status: 202 });
  router.post(
    '/auth/password/forgot',
    limiter,
    validate({ body: forgotPasswordBody }),
    asyncHandler(async (req, res) => {
      await service.requestPasswordReset(req.body.email, normalizeIp(req.ip));
      res.status(202).json({ message: 'Bu e-posta ile kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi.' });
    }),
  );

  doc('post', '/auth/password/reset', { tags, summary: 'Şifreyi sıfırla (e-postadaki token ile)', body: resetPasswordBody, response: authResponse });
  router.post(
    '/auth/password/reset',
    limiter,
    validate({ body: resetPasswordBody }),
    asyncHandler(async (req, res) => sendSession(res, await service.resetPassword(req.body.token, req.body.password))),
  );

  return router;
}
