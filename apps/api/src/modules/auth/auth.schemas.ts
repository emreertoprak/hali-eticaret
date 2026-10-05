import '@/openapi/registry';

import { z } from 'zod';

/** Parola politikası: 8-72 karakter (bcrypt 72 bayt sınırı), en az bir harf ve bir rakam. */
export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı.')
  .max(72, 'Şifre en fazla 72 karakter olabilir.')
  .regex(/[A-Za-zÇĞİÖŞÜçğıöşü]/, 'Şifre en az bir harf içermeli.')
  .regex(/\d/, 'Şifre en az bir rakam içermeli.');

const email = z.string().trim().toLowerCase().email('Geçerli bir e-posta adresi girin.').max(191);

export const registerBody = z
  .object({
    email,
    password: passwordSchema,
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{10,16}$/, 'Geçerli bir telefon numarası girin.')
      .optional(),
  })
  .openapi('RegisterRequest');

export const loginBody = z.object({ email, password: z.string().min(1).max(72) }).openapi('LoginRequest');

export const googleLoginBody = z.object({ credential: z.string().min(20).max(4096) }).openapi('GoogleLoginRequest');

export const forgotPasswordBody = z.object({ email }).openapi('ForgotPasswordRequest');

export const resetPasswordBody = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema })
  .openapi('ResetPasswordRequest');

export const changePasswordBody = z
  .object({ currentPassword: z.string().max(72).optional(), newPassword: passwordSchema })
  .openapi('ChangePasswordRequest');

export const userSchema = z
  .object({
    id: z.number(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    role: z.enum(['customer', 'admin']),
    avatarUrl: z.string().nullable(),
    hasPassword: z.boolean(),
    googleLinked: z.boolean(),
  })
  .openapi('User');

/** Refresh token yanıt gövdesinde yoktur; httpOnly çerez olarak gönderilir. */
export const authResponse = z
  .object({ user: userSchema, accessToken: z.string(), expiresIn: z.number() })
  .openapi('AuthResponse');

export const providersResponse = z
  .object({ password: z.boolean(), google: z.object({ enabled: z.boolean(), clientId: z.string().nullable() }) })
  .openapi('AuthProviders');

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
export type UserDto = z.infer<typeof userSchema>;
