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

  it('bekleyen kart siparişi elle onaylanamaz, yalnızca iptal edilebilir', async () => {
    const customer = await registerUser();
    const variant = await findVariant();
    await api().post('/api/v1/cart/items').set(auth(customer)).send({ variantId: variant.id, quantity: 1 }).expect(201);
    const created = await api().post('/api/v1/orders').set(auth(customer)).send({ paymentMethod: 'card', address: ADDRESS, acceptTerms: true }).expect(201);
    // mock sağlayıcı anında onaylar; bekleyen kart siparişi senaryosu için durumu geri al
    const row = await getDb()('orders').where({ order_no: created.body.order.orderNo }).first();
    await getDb()('orders').where({ id: row.id }).update({ status: 'pending_payment', payment_status: 'pending', paid_at: null });

    const detail = await api().get(`/api/v1/admin/orders/${row.id}`).set(auth(admin)).expect(200);
    expect(detail.body.allowedTransitions).toEqual(['cancelled']);
    await api().patch(`/api/v1/admin/orders/${row.id}/status`).set(auth(admin)).send({ status: 'confirmed' }).expect(409);
    const cancelled = await api().patch(`/api/v1/admin/orders/${row.id}/status`).set(auth(admin)).send({ status: 'cancelled' }).expect(200);
    expect(cancelled.body.paymentStatus).toBe('failed');
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
    // Para henüz iade edilmedi: yönetici sağlayıcıda iadeyi yapıp işaretler.
    expect(cancelled.body).toMatchObject({ status: 'cancelled', paymentStatus: 'refund_pending', allowedTransitions: [] });
    const refunded = await api().post(`/api/v1/admin/orders/${row.id}/refunded`).set(auth(admin)).expect(200);
    expect(refunded.body.paymentStatus).toBe('refunded');
    await api().post(`/api/v1/admin/orders/${row.id}/refunded`).set(auth(admin)).expect(409);
    const restored = await getDb()('product_variants').where({ id: variant.id }).first();
    expect(restored.stock).toBe(variant.stock);

    const list = await api().get('/api/v1/admin/orders').query({ status: 'cancelled' }).set(auth(admin)).expect(200);
    expect(list.body.items.some((o: { orderNo: string }) => o.orderNo === order.body.order.orderNo)).toBe(true);
  });
});

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('Yönetim — panel, yükleme, sipariş detayı', () => {
  let admin: string;
  beforeAll(async () => {
    admin = await login(ADMIN);
  });

  it('panel özeti istatistikleri döner', async () => {
    const res = await api().get('/api/v1/admin/stats').query({ days: 14 }).set(auth(admin)).expect(200);
    expect(res.body.series).toHaveLength(14);
    expect(res.body.series[13].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.revenue.period).toEqual({ revenue: expect.any(Number), orders: expect.any(Number) });
    expect(res.body.activeProducts).toBeGreaterThan(0);
    expect(Array.isArray(res.body.lowStock)).toBe(true);
    await api().get('/api/v1/admin/stats').query({ days: 1 }).set(auth(admin)).expect(400);
  });

  it('görsel yükler ve statik olarak sunar', async () => {
    const res = await api().post('/api/v1/admin/uploads').set(auth(admin)).attach('files', PNG, 'halı.png').expect(201);
    const [file] = res.body.files;
    expect(file).toMatchObject({ contentType: 'image/png', size: PNG.length });
    expect(file.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    const served = await api().get(file.url).expect(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['x-content-type-options']).toBe('nosniff');
  });

  it('SVG ve görsel olmayan dosyaları reddeder', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await api().post('/api/v1/admin/uploads').set(auth(admin)).attach('files', svg, { filename: 'x.png', contentType: 'image/png' }).expect(400);
    expect(res.body.error.details.files).toEqual(['x.png']);
    await api().post('/api/v1/admin/uploads').set(auth(admin)).expect(400);
  });

  it('müşteri görsel yükleyemez', async () => {
    const customer = await registerUser();
    await api().post('/api/v1/admin/uploads').set(auth(customer)).attach('files', PNG, 'a.png').expect(403);
  });

  it('ürün listesi fiyat aralığı, stok ve görsel içerir', async () => {
    const res = await api().get('/api/v1/admin/products').query({ limit: 5 }).set(auth(admin)).expect(200);
    const p = res.body.items[0];
    expect(p).toMatchObject({ minPrice: expect.any(Number), maxPrice: expect.any(Number), totalStock: expect.any(Number), variantCount: expect.any(Number) });
    expect(p.maxPrice).toBeGreaterThanOrEqual(p.minPrice);
    expect(p.imageUrl).toEqual(expect.any(String));
  });

  it('sipariş detayı, arama ve kargo bilgisiyle durum akışı', async () => {
    const customer = await registerUser();
    const variant = await findVariant();
    await api().post('/api/v1/cart/items').set(auth(customer)).send({ variantId: variant.id, quantity: 1 }).expect(201);
    const created = await api().post('/api/v1/orders').set(auth(customer)).send({ paymentMethod: 'bank_transfer', address: ADDRESS, acceptTerms: true }).expect(201);
    const orderNo = created.body.order.orderNo;

    const search = await api().get('/api/v1/admin/orders').query({ q: orderNo.toLowerCase() }).set(auth(admin)).expect(200);
    expect(search.body.items).toHaveLength(1);
    const id = search.body.items[0].id;
    expect(search.body.items[0].customer.email).toMatch(/@example\.com$/);

    const detail = await api().get(`/api/v1/admin/orders/${id}`).set(auth(admin)).expect(200);
    expect(detail.body.allowedTransitions).toEqual(['confirmed', 'cancelled']);
    expect(detail.body.customer).toMatchObject({ firstName: 'Test' });
    expect(detail.body.payments).toEqual([]);

    const confirmed = await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(admin)).send({ status: 'confirmed' }).expect(200);
    expect(confirmed.body).toMatchObject({ paymentStatus: 'paid', allowedTransitions: ['preparing', 'cancelled'] });
    expect(confirmed.body.paidAt).toEqual(expect.any(String));
    await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(admin)).send({ status: 'preparing' }).expect(200);
    await api().patch(`/api/v1/admin/orders/${id}/status`).set(auth(admin)).send({ status: 'shipped' }).expect(400);
    const shipped = await api()
      .patch(`/api/v1/admin/orders/${id}/status`)
      .set(auth(admin))
      .send({ status: 'shipped', carrier: 'Yurtiçi Kargo', trackingNumber: 'YK123456789' })
      .expect(200);
    expect(shipped.body).toMatchObject({ status: 'shipped', carrier: 'Yurtiçi Kargo', trackingNumber: 'YK123456789' });

    const mine = await api().get(`/api/v1/orders/${orderNo}`).set(auth(customer)).expect(200);
    expect(mine.body.trackingNumber).toBe('YK123456789');
    await api().get('/api/v1/admin/orders/999999').set(auth(admin)).expect(404);
  });
});
