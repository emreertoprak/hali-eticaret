import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { loadConfig } from '@/config/Config';
import { AppError } from '@/utils/AppError';

import { UserRepository,type UserRow } from './auth.repository';
import type { LoginBody, RegisterBody, UserDto } from './auth.schemas';

const BCRYPT_ROUNDS = 10;

export const toUser = (u: UserRow): UserDto => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  phone: u.phone,
  role: u.role,
});

export class AuthService {
  constructor(private readonly users = new UserRepository()) {}

  private issueTokens(user: UserRow) {
    const { jwt: cfg } = loadConfig();
    const claims = { sub: String(user.id), email: user.email, role: user.role };
    const accessToken = jwt.sign({ ...claims, typ: 'access' }, cfg.accessSecret, {
      expiresIn: cfg.accessTtl as SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign({ sub: String(user.id), typ: 'refresh' }, cfg.refreshSecret, {
      expiresIn: cfg.refreshTtl as SignOptions['expiresIn'],
    });
    return { user: toUser(user), accessToken, refreshToken };
  }

  async register(body: RegisterBody) {
    if (await this.users.findByEmail(body.email)) {
      throw AppError.conflict('Bu e-posta adresi ile kayıtlı bir hesap var.');
    }
    const id = await this.users.create({
      email: body.email,
      password_hash: await bcrypt.hash(body.password, BCRYPT_ROUNDS),
      first_name: body.firstName,
      last_name: body.lastName,
      phone: body.phone ?? null,
      role: 'customer',
    });
    const user = await this.users.findById(id);
    return this.issueTokens(user!);
  }

  async login(body: LoginBody) {
    const user = await this.users.findByEmail(body.email);
    const valid = user ? await bcrypt.compare(body.password, user.password_hash) : false;
    if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let userId: number;
    try {
      const payload = jwt.verify(refreshToken, loadConfig().jwt.refreshSecret) as jwt.JwtPayload;
      if (payload.typ !== 'refresh') throw new Error('typ');
      userId = Number(payload.sub);
    } catch {
      throw AppError.unauthorized('Oturum yenilenemedi, lütfen tekrar giriş yapın.');
    }
    const user = await this.users.findById(userId);
    if (!user) throw AppError.unauthorized();
    return this.issueTokens(user);
  }

  async me(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı.');
    return toUser(user);
  }
}
