import 'dotenv/config';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

const installmentRuleSchema = z.object({
  minTotal: z.number().nonnegative(),
  maxCount: z.number().int().min(1),
});

export const configSchema = z.object({
  env: z.enum(['development', 'test', 'production']),
  port: z.number().int().positive(),
  brand: z.object({ name: z.string(), whatsapp: z.string() }),
  cors: z.object({ origins: z.array(z.string()) }),
  db: z.object({
    host: z.string(),
    port: z.number().int(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
    pool: z.object({ min: z.number().int(), max: z.number().int() }),
  }),
  redis: z.object({ url: z.string(), keyPrefix: z.string() }),
  cache: z.object({ homeTtlSeconds: z.number().int(), catalogTtlSeconds: z.number().int() }),
  jwt: z.object({
    accessSecret: z.string().min(32),
    refreshSecret: z.string().min(32),
    accessTtl: z.string(),
    refreshTtl: z.string(),
  }),
  rateLimit: z.object({
    store: z.enum(['redis', 'memory']),
    windowMs: z.number().int(),
    max: z.number().int(),
    authMax: z.number().int(),
  }),
  commerce: z.object({
    currency: z.string(),
    shippingFee: z.number().nonnegative(),
    freeShippingThreshold: z.number().nonnegative(),
    installments: z.array(installmentRuleSchema),
  }),
  logging: z.object({ level: z.string(), dir: z.string(), accessLog: z.boolean() }),
  publicWebUrl: z.string().url(),
  payment: z.object({
    provider: z.enum(['mock', 'paytr']),
    pendingOrderTtlMinutes: z.number().int().min(5),
    paytr: z.object({
      apiUrl: z.string().url(),
      iframeBaseUrl: z.string().url(),
      merchantId: z.string(),
      merchantKey: z.string(),
      merchantSalt: z.string(),
      testMode: z.boolean(),
      debug: z.boolean(),
      timeoutLimitMinutes: z.number().int().min(1),
    }),
  }),
  uploads: z.object({ dir: z.string(), publicPath: z.string(), maxFileMb: z.number().positive() }),
});

/** Ödeme sağlayıcısı PayTR ise mağaza bilgileri zorunludur. */
const validatedConfigSchema = configSchema.superRefine((c, ctx) => {
  if (c.payment.provider !== 'paytr') return;
  for (const key of ['merchantId', 'merchantKey', 'merchantSalt'] as const) {
    if (!c.payment.paytr[key]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['payment', 'paytr', key], message: `PayTR için ${key} gerekli (PAYTR_* env).` });
    }
  }
});

export type AppConfig = z.infer<typeof configSchema>;

const DEFAULT_CONFIG_PATH = './config/settings.dev.json';

/** Ortam değişkenleri JSON dosyasındaki gizli/ortama özel değerleri ezer. */
function applyEnvOverrides(raw: Record<string, any>): Record<string, any> {
  const env = process.env;
  const num = (v: string | undefined) => (v === undefined ? undefined : Number(v));
  const pick = <T>(value: T | undefined, fallback: T) => (value === undefined ? fallback : value);

  return {
    ...raw,
    port: pick(num(env.PORT), raw.port),
    db: {
      ...raw.db,
      host: pick(env.DB_HOST, raw.db?.host),
      port: pick(num(env.DB_PORT), raw.db?.port),
      user: pick(env.DB_USER, raw.db?.user),
      password: pick(env.DB_PASSWORD, raw.db?.password),
      database: pick(env.DB_NAME, raw.db?.database),
    },
    redis: { ...raw.redis, url: pick(env.REDIS_URL, raw.redis?.url) },
    jwt: {
      ...raw.jwt,
      accessSecret: pick(env.JWT_ACCESS_SECRET || undefined, raw.jwt?.accessSecret),
      refreshSecret: pick(env.JWT_REFRESH_SECRET || undefined, raw.jwt?.refreshSecret),
    },
    publicWebUrl: pick(env.PUBLIC_WEB_URL || undefined, raw.publicWebUrl),
    payment: {
      ...raw.payment,
      provider: pick(env.PAYMENT_PROVIDER || undefined, raw.payment?.provider),
      paytr: {
        ...raw.payment?.paytr,
        apiUrl: pick(env.PAYTR_API_URL || undefined, raw.payment?.paytr?.apiUrl),
        merchantId: pick(env.PAYTR_MERCHANT_ID || undefined, raw.payment?.paytr?.merchantId),
        merchantKey: pick(env.PAYTR_MERCHANT_KEY || undefined, raw.payment?.paytr?.merchantKey),
        merchantSalt: pick(env.PAYTR_MERCHANT_SALT || undefined, raw.payment?.paytr?.merchantSalt),
        testMode: env.PAYTR_TEST_MODE === undefined ? raw.payment?.paytr?.testMode : env.PAYTR_TEST_MODE === '1',
      },
    },
  };
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const path = resolve(process.cwd(), process.env.HALI_API_CONFIG_PATH ?? DEFAULT_CONFIG_PATH);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const parsed = validatedConfigSchema.safeParse(applyEnvOverrides(raw));
  if (!parsed.success) {
    throw new Error(`Geçersiz config (${path}): ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
