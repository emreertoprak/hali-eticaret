import { getDb } from '@/infra/db';

import { ADDRESS, ADMIN, api, findVariant, login, registerUser, teardown } from '../helpers';

afterAll(teardown);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Yönetim', () => {
  let admin: string;
  beforeAll(async () => {
    admin = await login(ADMIN);
  });

  it('müşteri yönetim uçlarına erişemez', async () => {
    const customer = await registerUser();
    await api().get('/api/v1/admin/products').set(auth(customer)).expect(403);
    await api().get('/api/v1/admin/products').expect(401);
  });

  it('kategori oluşturur, günceller ve siler', async () => {
    const created = await api().post('/api/v1/admin/categories').set(auth(admin)).send({ name: 'Test Yolluk Halı' }).expect(201);
    expect(created.body.slug).toBe('test-yolluk-hali');
    await api().post('/api/v1/admin/categories').set(auth(admin)).send({ name: 'Test Yolluk Halı' }).expect(409);

    const updated = await api()
      .put(`/api/v1/admin/categories/${created.body.id}`)
      .set(auth(admin))
      .send({ name: 'Test Yolluk', slug: 'test-yolluk', showInStories: false })
      .expect(200);
    expect(updated.body).toMatchObject({ slug: 'test-yolluk', showInStories: false });
    await api().delete(`/api/v1/admin/categories/${created.body.id}`).set(auth(admin)).expect(204);
  });

  it('ürünü varyant ve görselleriyle oluşturur, günceller, pasife alır', async () => {
    const category = await getDb()('categories').first();
    const body = {
      categoryId: category.id,
      name: 'Test Halı Admin',
      skuBase: 'TST-ADM',
      images: [{ url: '/images/rugs/test.svg' }],
      variants: [
        { sku: 'TST-ADM-80150', widthCm: 80, lengthCm: 150, price: 1000, discountPrice: 800, stock: 5 },
        { sku: 'TST-ADM-160230', widthCm: 160, lengthCm: 230, price: 3000, stock: 2 },
      ],
    };
    const created = await api().post('/api/v1/admin/products').set(auth(admin)).send(body).expect(201);
    expect(created.body.slug).toBe('test-hali-admin');
    expect(created.body.variants).toHaveLength(2);

    const detail = await api().get('/api/v1/products/test-hali-admin').expect(200);
    expect(detail.body).toMatchObject({ price: 800, oldPrice: 1000, discountRate: 20 });

    const keep = created.body.variants.find((v: { sku: string }) => v.sku === 'TST-ADM-80150');
    await api()
      .put(`/api/v1/admin/products/${created.body.id}`)
      .set(auth(admin))
      .send({ ...body, variants: [{ ...body.variants[0], id: keep.id, price: 1200, discountPrice: null }] })
      .expect(200);
    const afterUpdate = await api().get('/api/v1/products/test-hali-admin').expect(200);
    expect(afterUpdate.body.variants).toHaveLength(1);
    expect(afterUpdate.body).toMatchObject({ price: 1200, oldPrice: null });

    await api().delete(`/api/v1/admin/products/${created.body.id}`).set(auth(admin)).expect(204);
    await api().get('/api/v1/products/test-hali-admin').expect(404);
  });

  it('indirimli fiyat liste fiyatından yüksekse reddeder', async () => {
    const category = await getDb()('categories').first();
    await api()
      .post('/api/v1/admin/products')
      .set(auth(admin))
      .send({
        categoryId: category.id,
        name: 'Hatalı',
        skuBase: 'TST-ERR',
        variants: [{ sku: 'TST-ERR-1', widthCm: 80, lengthCm: 150, price: 100, discountPrice: 200, stock: 1 }],
      })
      .expect(400);
  });

  it('sipariş durum geçişleri ve iptalde stok iadesi', async () => {
    const customer = await registerUser();
    const variant = await findVariant({ minStock: 3 });
    await api().post('/api/v1/cart/items').set(auth(customer)).send({ variantId: variant.id, quantity: 2 }).expect(201);
    const order = await api()
      .post('/api/v1/orders')
      .set(auth(customer))
      .send({ paymentMethod: 'bank_transfer', address: ADDRESS, acceptTerms: true })
      .expect(201);
    const row = await getDb()('orders').where({ order_no: order.body.order.orderNo }).first();

    await api().patch(`/api/v1/admin/orders/${row.id}/status`).set(auth(admin)).send({ status: 'delivered' }).expect(409);
    const confirmed = await api().patch(`/api/v1/admin/orders/${row.id}/status`).set(auth(admin)).send({ status: 'confirmed' }).expect(200);
    expect(confirmed.body.paymentStatus).toBe('paid');

    const cancelled = await api().patch(`/api/v1/admin/orders/${row.id}/status`).set(auth(admin)).send({ status: 'cancelled' }).expect(200);
    expect(cancelled.body).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded' });
    const restored = await getDb()('product_variants').where({ id: variant.id }).first();
    expect(restored.stock).toBe(variant.stock);

    const list = await api().get('/api/v1/admin/orders').query({ status: 'cancelled' }).set(auth(admin)).expect(200);
    expect(list.body.items.some((o: { orderNo: string }) => o.orderNo === order.body.order.orderNo)).toBe(true);
  });
});
