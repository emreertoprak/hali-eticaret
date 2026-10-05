import { createHash, randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { loadConfig } from '@/config/Config';
import { getDb } from '@/infra/db';
import { getLogger } from '@/infra/logger';
import { getMailer, type Mailer } from '@/infra/mailer';
import { getRedis } from '@/infra/redis';
import { AppError } from '@/utils/AppError';

import { UserRepository,type UserRow } from './auth.repository';
import type { LoginBody, RegisterBody, UserDto } from './auth.schemas';
import { type GoogleIdentity, verifyGoogleCredential } from './google';
import { LoginThrottle } from './loginThrottle';
import { SessionStore } from './sessions';

const logger = getLogger('auth');

export const toUser = (u: UserRow): UserDto => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  phone: u.phone,
  role: u.role,
  avatarUrl: u.avatar_url ?? null,
  hasPassword: Boolean(u.password_hash),
  googleLinked: Boolean(u.google_sub),
});

export interface IssuedSession {
  user: UserDto;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');

/** Kullanıcı yokken de bcrypt karşılaştırması yapılarak yanıt süresinden hesap varlığı anlaşılamaz. */
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('dummy-password-for-timing', loadConfig().security.bcryptRounds));

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly sessions = new SessionStore(),
    private readonly throttle = new LoginThrottle(),
    private readonly mailer: Mailer = getMailer(),
    private readonly verifyGoogle: (credential: string) => Promise<GoogleIdentity> = verifyGoogleCredential,
  ) {}

  private hash(password: string) {
    return bcrypt.hash(password, loadConfig().security.bcryptRounds);
  }

  /** Kısa ömürlü access token + tek kullanımlık refresh token (Redis'te kayıtlı) üretir. */
  async issueSession(user: UserRow): Promise<IssuedSession> {
    const { jwt: cfg } = loadConfig();
    const base = { issuer: cfg.issuer, audience: cfg.audience, subject: String(user.id) };
    const accessToken = jwt.sign({ email: user.email, role: user.role, typ: 'access' }, cfg.accessSecret, {
      ...base,
      algorithm: 'HS256',
      expiresIn: cfg.accessTtl as SignOptions['expiresIn'],
    });
    const jti = this.sessions.newId();
    const refreshToken = jwt.sign({ typ: 'refresh' }, cfg.refreshSecret, {
      ...base,
      algorithm: 'HS256',
      jwtid: jti,
      expiresIn: cfg.refreshTtl as SignOptions['expiresIn'],
    });
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = (jwt.decode(accessToken) as jwt.JwtPayload).exp! - now;
    const refreshExpiresIn = (jwt.decode(refreshToken) as jwt.JwtPayload).exp! - now;
    await this.sessions.save(jti, user.id, refreshExpiresIn);
    return { user: toUser(user), accessToken, expiresIn, refreshToken, refreshExpiresIn };
  }

  async register(body: RegisterBody) {
    if (await this.users.findByEmail(body.email)) {
      throw AppError.conflict('Bu e-posta adresi ile kayıtlı bir hesap var.');
    }
    const id = await this.users.create({
      email: body.email,
      password_hash: await this.hash(body.password),
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone ?? null,
      role: 'customer',
    });
    return this.issueSession((await this.users.findById(id))!);
  }

  async login(body: LoginBody) {
    const lockedFor = await this.throttle.lockedFor(body.email);
    if (lockedFor > 0) {
      throw new AppError(429, 'ACCOUNT_LOCKED', `Çok fazla hatalı deneme. ${Math.ceil(lockedFor / 60)} dakika sonra tekrar deneyin veya şifrenizi sıfırlayın.`);
    }
    const user = await this.users.findByEmail(body.email);
    const valid = await bcrypt.compare(body.password, user?.password_hash ?? getDummyHash());
    if (!user || !user.password_hash || !valid) {
      await this.throttle.fail(body.email);
      throw invalidCredentials();
    }
    await this.throttle.reset(body.email);
    return this.issueSession(user);
  }

  /**
   * Google ile giriş/kayıt. Mevcut e-posta hesabı Google kimliğine bağlanır. Sitede doğrulanmamış
   * bir e-postayla açılmış hesabın şifresi bağlama sırasında sıfırlanır: aksi halde e-postayı
   * önceden kaydeden biri, gerçek sahibin Google hesabıyla paylaşılan bir hesaba erişebilirdi.
   */
  async loginWithGoogle(credential: string) {
    const identity = await this.verifyGoogle(credential);
    let user = await this.users.findByGoogleSub(identity.sub);

    if (!user) {
      const existing = await this.users.findByEmail(identity.email);
      if (existing) {
        if (existing.google_sub && existing.google_sub !== identity.sub) {
          throw AppError.conflict('Bu e-posta başka bir Google hesabına bağlı.');
        }
        const unverified = !existing.email_verified_at;
        await this.users.update(existing.id, {
          google_sub: identity.sub,
          avatar_url: existing.avatar_url ?? identity.picture,
          email_verified_at: existing.email_verified_at ?? new Date(),
          ...(unverified ? { password_hash: null } : {}),
        });
        if (unverified) {
          await this.sessions.revokeAll(existing.id);
          logger.warn(`Doğrulanmamış hesap ${existing.id} Google'a bağlandı; şifre ve oturumlar sıfırlandı.`);
        }
        user = await this.users.findById(existing.id);
      } else {
        const id = await this.users.create({
          email: identity.email,
          password_hash: null,
          first_name: identity.firstName,
          last_name: identity.lastName,
          role: 'customer',
          google_sub: identity.sub,
          avatar_url: identity.picture,
          email_verified_at: new Date(),
        });
        user = await this.users.findById(id);
      }
    }
    return this.issueSession(user!);
  }

  /** Refresh token rotasyonu: eski token tüketilir, yenisi verilir. Yeniden kullanım tüm oturumları kapatır. */
  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw AppError.unauthorized('Oturum bulunamadı, lütfen giriş yapın.');
    const { jwt: cfg } = loadConfig();
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, cfg.refreshSecret, { algorithms: ['HS256'], issuer: cfg.issuer, audience: cfg.audience }) as jwt.JwtPayload;
      if (payload.typ !== 'refresh' || !payload.jti || !payload.sub) throw new Error('typ');
    } catch {
      throw AppError.unauthorized('Oturum yenilenemedi, lütfen tekrar giriş yapın.');
    }
    const userId = Number(payload.sub);
    if (!(await this.sessions.consume(payload.jti, userId))) {
      logger.warn(`Kullanılmış/iptal edilmiş refresh token tekrar kullanıldı (kullanıcı ${userId}); tüm oturumlar kapatılıyor.`);
      await this.sessions.revokeAll(userId);
      throw AppError.unauthorized('Oturumunuz sonlandırıldı, lütfen tekrar giriş yapın.');
    }
    const user = await this.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    return this.issueSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const { jwt: cfg } = loadConfig();
    try {
      const payload = jwt.verify(refreshToken, cfg.refreshSecret, { algorithms: ['HS256'], issuer: cfg.issuer, audience: cfg.audience }) as jwt.JwtPayload;
      if (payload.jti) await this.sessions.revoke(payload.jti, Number(payload.sub));
    } catch {
      /* geçersiz token: zaten oturum yok */
    }
  }

  logoutAll(userId: number) {
    return this.sessions.revokeAll(userId);
  }

  async me(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı.');
    return toUser(user);
  }

  /** Şifre değiştirme; tüm diğer oturumlar kapatılır ve yeni oturum verilir. */
  async changePassword(userId: number, currentPassword: string | undefined, newPassword: string) {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    if (user.password_hash && !(await bcrypt.compare(currentPassword ?? '', user.password_hash))) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Mevcut şifreniz hatalı.');
    }
    await this.users.update(userId, { password_hash: await this.hash(newPassword), password_changed_at: new Date() });
    await this.sessions.revokeAll(userId);
    return this.issueSession((await this.users.findById(userId))!);
  }

  /**
   * Şifre sıfırlama isteği. Hesap var olsun ya da olmasın aynı yanıt döner (hesap keşfini önler).
   * E-posta başına dakikada bir istek; token yalnızca özetiyle saklanır.
   */
  async requestPasswordReset(email: string, ip: string): Promise<void> {
    const throttled = await getRedis().set(`pwreset:${email}`, '1', 'EX', 60, 'NX');
    if (!throttled) return;
    const user = await this.users.findByEmail(email);
    if (!user) return;

    const { auth, publicWebUrl, brand } = loadConfig();
    const token = randomBytes(32).toString('base64url');
    await getDb()('password_resets').where({ user_id: user.id }).whereNull('used_at').update({ used_at: getDb().fn.now() });
    await getDb()('password_resets').insert({
      user_id: user.id,
      token_hash: sha256(token),
      expires_at: new Date(Date.now() + auth.passwordResetTtlMinutes * 60_000),
      requested_ip: ip.slice(0, 45),
    });
    const link = `${publicWebUrl}/sifre-sifirla?token=${token}`;
    await this.mailer.send({
      to: user.email,
      subject: `${brand.name} — Şifre sıfırlama`,
      text: `Merhaba ${user.first_name},\n\nŞifrenizi sıfırlamak için bağlantıya tıklayın (${auth.passwordResetTtlMinutes} dakika geçerli):\n${link}\n\nBu isteği siz yapmadıysanız bu e-postayı yok sayın.`,
    });
  }

  async resetPassword(token: string, password: string) {
    const row = await getDb()('password_resets').where({ token_hash: sha256(token) }).first();
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.');
    }
    // Aynı token'ın iki kez kullanılmasını önlemek için koşullu güncelleme.
    const claimed = await getDb()('password_resets').where({ id: row.id }).whereNull('used_at').update({ used_at: getDb().fn.now() });
    if (!claimed) throw new AppError(400, 'INVALID_RESET_TOKEN', 'Şifre sıfırlama bağlantısı zaten kullanılmış.');

    // E-postadaki bağlantıya erişim, e-postanın sahibi olunduğunu kanıtlar.
    await this.users.update(row.user_id, { password_hash: await this.hash(password), password_changed_at: new Date(), email_verified_at: new Date() });
    await this.sessions.revokeAll(row.user_id);
    const user = (await this.users.findById(row.user_id))!;
    await this.throttle.reset(user.email);
    return this.issueSession(user);
  }

  providers() {
    const { clientId } = loadConfig().auth.google;
    return { password: true, google: { enabled: Boolean(clientId), clientId: clientId || null } };
  }
}
