import request from 'supertest';

import { createApp } from '@/App';
import { closeDb, getDb } from '@/infra/db';
import { closeRedis, getRedis } from '@/infra/redis';

export const app = createApp();
export const api = () => request(app);

export const DEMO = { email: 'demo@halievi.local', password: 'Demo1234!' };
export const ADMIN = { email: 'admin@halievi.local', password: 'Admin123!' };

export async function login(creds = DEMO): Promise<string> {
  const res = await api().post('/api/v1/auth/login').send(creds).expect(200);
  return res.body.accessToken;
}

export async function registerUser(): Promise<string> {
  const email = `test-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.com`;
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ email, password: 'Sifre1234', firstName: 'Test', lastName: 'Kullanıcı' })
    .expect(201);
  return res.body.accessToken;
}

/** Stoklu, aktif ve fiyatı verilen aralıkta olan bir varyant bulur. */
export async function findVariant(opts: { minStock?: number; minPrice?: number; maxPrice?: number } = {}) {
  const row = await getDb()('product_variants')
    .where('is_active', true)
    .andWhere('stock', '>=', opts.minStock ?? 3)
    .modify((qb) => {
      if (opts.minPrice !== undefined) qb.andWhereRaw('COALESCE(discount_price, price) >= ?', [opts.minPrice]);
      if (opts.maxPrice !== undefined) qb.andWhereRaw('COALESCE(discount_price, price) <= ?', [opts.maxPrice]);
    })
    .orderBy('id')
    .first();
  if (!row) throw new Error('Uygun varyant bulunamadı');
  return row as { id: number; stock: number; price: number; discount_price: number | null };
}

export const ADDRESS = {
  fullName: 'Test Kullanıcı',
  phone: '5551234567',
  city: 'İstanbul',
  district: 'Kadıköy',
  addressLine: 'Caferağa Mah. Moda Cad. No:10 D:3',
};

export const CARD = { holderName: 'Test Kullanici', number: '4111 1111 1111 1111', expiry: '12/30', cvv: '123' };

export async function teardown(): Promise<void> {
  await getRedis().flushall();
  await closeRedis();
  await closeDb();
}
