import { getDb } from '@/infra/db';

import { ADDRESS, api, findVariant, registerUser, teardown } from '../helpers';

afterAll(teardown);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Sepet', () => {
  it('misafir sepeti oluşturur ve token ile devam eder', async () => {
    const variant = await findVariant();
    const add = await api().post('/api/v1/cart/items').send({ variantId: variant.id, quantity: 1 }).expect(201);
    const token = add.body.token;
    expect(add.headers['x-cart-token']).toBe(token);
    expect(add.body.itemCount).toBe(1);

    const again = await api().post('/api/v1/cart/items').set('X-Cart-Token', token).send({ variantId: variant.id, quantity: 2 }).expect(201);
    expect(again.body.items).toHaveLength(1);
    expect(again.body.items[0].quantity).toBe(3);

    const itemId = again.body.items[0].id;
    const updated = await api().patch(`/api/v1/cart/items/${itemId}`).set('X-Cart-Token', token).send({ quantity: 1 }).expect(200);
    expect(updated.body.itemCount).toBe(1);

    const removed = await api().delete(`/api/v1/cart/items/${itemId}`).set('X-Cart-Token', token).expect(200);
    expect(removed.body.items).toHaveLength(0);
    expect(removed.body.shippingFee).toBe(0);
  });

  it('stoktan fazla ekleme 409 döner', async () => {
    const variant = await findVariant({ minStock: 1 });
    const res = await api().post('/api/v1/cart/items').send({ variantId: variant.id, quantity: Math.min(20, variant.stock + 1) });
    if (variant.stock + 1 <= 20) {
      expect(res.status).toBe(409);
      expect(res.body.error.details.stock).toBe(variant.stock);
    }
  });

  it('olmayan varyant 404', async () => {
    await api().post('/api/v1/cart/items').send({ variantId: 999999, quantity: 1 }).expect(404);
  });

  it('girişte misafir sepeti üye sepetine taşınır', async () => {
    const token = await registerUser();
    const variant = await findVariant();
    const guest = await api().post('/api/v1/cart/items').send({ variantId: variant.id, quantity: 2 }).expect(201);

    const merged = await api().get('/api/v1/cart').set(auth(token)).set('X-Cart-Token', guest.body.token).expect(200);
    expect(merged.body.itemCount).toBe(2);
    expect(merged.body.token).toBe(guest.body.token);

    // Aynı misafir token'ı artık sahipsiz değil; başka bir misafir erişemez.
    const anon = await api().get('/api/v1/cart').set('X-Cart-Token', guest.body.token).expect(200);
    expect(anon.body.token).not.toBe(guest.body.token);
  });
});

describe('Sipariş', () => {
  it('kartla sipariş oluşturur, stoğu düşer ve sepeti boşaltır', async () => {
    const token = await registerUser();
    const variant = await findVariant({ minStock: 5 });
    await api().post('/api/v1/cart/items').set(auth(token)).send({ variantId: variant.id, quantity: 2 }).expect(201);

    const res = await api()
      .post('/api/v1/orders')
      .set(auth(token))
      .send({ paymentMethod: 'card', address: ADDRESS, acceptTerms: true })
      .expect(201);
    // Test ortamında ödeme sağlayıcısı "mock": ödeme anında onaylanır.
    expect(res.body.payment).toMatchObject({ type: 'completed', provider: 'mock' });
    const order = res.body.order;
    expect(order).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', installmentCount: 1 });
    expect(order.paidAt).toEqual(expect.any(String));
    expect(order.orderNo).toMatch(/^HE\d{12}$/);
    expect(order.items[0]).toMatchObject({ variantId: variant.id, quantity: 2 });

    const after = await getDb()('product_variants').where({ id: variant.id }).first();
    expect(after.stock).toBe(variant.stock - 2);

    const cart = await api().get('/api/v1/cart').set(auth(token)).expect(200);
    expect(cart.body.itemCount).toBe(0);

    const list = await api().get('/api/v1/orders').set(auth(token)).expect(200);
    expect(list.body.total).toBe(1);
    await api().get(`/api/v1/orders/${order.orderNo}`).set(auth(token)).expect(200);

    // Başka kullanıcı bu siparişi göremez.
    const other = await registerUser();
    await api().get(`/api/v1/orders/${order.orderNo}`).set(auth(other)).expect(404);
  });

  it('havale ile sipariş ödeme bekliyor durumunda başlar', async () => {
    const token = await registerUser();
    const variant = await findVariant();
    await api().post('/api/v1/cart/items').set(auth(token)).send({ variantId: variant.id, quantity: 1 }).expect(201);
    const res = await api()
      .post('/api/v1/orders')
      .set(auth(token))
      .send({ paymentMethod: 'bank_transfer', address: ADDRESS, acceptTerms: true })
      .expect(201);
    expect(res.body.order).toMatchObject({ status: 'pending_payment', paymentStatus: 'pending', paymentExpiresAt: null });
    expect(res.body.payment).toBeNull();
    const cart = await api().get('/api/v1/cart').set(auth(token)).expect(200);
    expect(cart.body.itemCount).toBe(0);
  });

  it('stok sipariş anında yetersizse 409 döner', async () => {
    const token = await registerUser();
    const variant = await findVariant({ minStock: 2 });
    await api().post('/api/v1/cart/items').set(auth(token)).send({ variantId: variant.id, quantity: 2 }).expect(201);
    await getDb()('product_variants').where({ id: variant.id }).update({ stock: 1 });
    try {
      const res = await api()
        .post('/api/v1/orders')
        .set(auth(token))
        .send({ paymentMethod: 'card', address: ADDRESS, acceptTerms: true })
        .expect(409);
      expect(res.body.error.details[0]).toMatchObject({ stock: 1 });
    } finally {
      await getDb()('product_variants').where({ id: variant.id }).update({ stock: variant.stock });
    }
  });

  it('boş sepet, sözleşme onayı ve kart bilgisi doğrulanır', async () => {
    const token = await registerUser();
    await api().post('/api/v1/orders').set(auth(token)).send({ paymentMethod: 'bank_transfer', address: ADDRESS, acceptTerms: true }).expect(400);
    await api().post('/api/v1/orders').set(auth(token)).send({ paymentMethod: 'bank_transfer', address: ADDRESS, acceptTerms: false }).expect(400);
    await api().post('/api/v1/orders').set(auth(token)).send({ paymentMethod: 'cash', address: ADDRESS, acceptTerms: true }).expect(400);
  });

  it('kayıtlı adres ile sipariş verilebilir', async () => {
    const token = await registerUser();
    const address = await api().post('/api/v1/addresses').set(auth(token)).send({ ...ADDRESS, title: 'Ev' }).expect(201);
    expect(address.body.isDefault).toBe(true);
    const variant = await findVariant();
    await api().post('/api/v1/cart/items').set(auth(token)).send({ variantId: variant.id, quantity: 1 }).expect(201);
    const res = await api()
      .post('/api/v1/orders')
      .set(auth(token))
      .send({ paymentMethod: 'bank_transfer', addressId: address.body.id, acceptTerms: true })
      .expect(201);
    expect(res.body.order.shippingAddress).toMatchObject({ title: 'Ev', city: 'İstanbul' });
  });

  it('giriş yapmadan sipariş 401', async () => {
    await api().post('/api/v1/orders').send({}).expect(401);
  });
});
