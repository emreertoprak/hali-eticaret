import '@/openapi/registry';

import { z } from 'zod';

const password = z.string().min(8, 'Şifre en az 8 karakter olmalı.').max(72);

export const registerBody = z
  .object({
    email: z.string().trim().toLowerCase().email().max(191),
    password,
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{10,16}$/, 'Geçerli bir telefon numarası girin.')
      .optional(),
  })
  .openapi('RegisterRequest');

export const loginBody = z
  .object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) })
  .openapi('LoginRequest');

export const refreshBody = z.object({ refreshToken: z.string().min(10) }).openapi('RefreshRequest');

export const userSchema = z
  .object({
    id: z.number(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    role: z.enum(['customer', 'admin']),
  })
  .openapi('User');

export const authResponse = z
  .object({ user: userSchema, accessToken: z.string(), refreshToken: z.string() })
  .openapi('AuthResponse');

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
export type UserDto = z.infer<typeof userSchema>;
