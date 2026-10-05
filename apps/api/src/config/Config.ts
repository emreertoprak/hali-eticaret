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
  };
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const path = resolve(process.cwd(), process.env.HALI_API_CONFIG_PATH ?? DEFAULT_CONFIG_PATH);
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const parsed = configSchema.safeParse(applyEnvOverrides(raw));
  if (!parsed.success) {
    throw new Error(`Geçersiz config (${path}): ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
