import { OAuth2Client } from 'google-auth-library';

import { loadConfig } from '@/config/Config';
import { getLogger } from '@/infra/logger';
import { AppError } from '@/utils/AppError';

export interface GoogleIdentity {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string | null;
}

let client: OAuth2Client | undefined;

/**
 * Google Identity Services'in verdiği ID token'ı (JWT) doğrular: imza (Google public key'leri),
 * audience (bizim client ID'miz), issuer ve süre kontrolleri google-auth-library tarafından yapılır.
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity> {
  const { clientId } = loadConfig().auth.google;
  if (!clientId) throw new AppError(404, 'PROVIDER_DISABLED', 'Google ile giriş etkin değil.');
  client ??= new OAuth2Client(clientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (err) {
    getLogger('auth').warn(`Google token doğrulanamadı: ${(err as Error).message}`);
    throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Google oturumu doğrulanamadı. Lütfen tekrar deneyin.');
  }
  if (!payload?.sub || !payload.email) throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Google hesabında e-posta bulunamadı.');
  if (!payload.email_verified) throw new AppError(401, 'EMAIL_NOT_VERIFIED', 'Google hesabınızın e-posta adresi doğrulanmamış.');

  const [first, ...rest] = (payload.name ?? payload.email.split('@')[0]).split(' ');
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    firstName: (payload.given_name ?? first).slice(0, 80),
    lastName: (payload.family_name ?? (rest.join(' ') || '-')).slice(0, 80),
    picture: payload.picture ?? null,
  };
}
