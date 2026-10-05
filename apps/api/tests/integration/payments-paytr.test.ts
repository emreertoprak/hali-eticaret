import './paytr.env';

import { createHmac } from 'node:crypto';

import axios from 'axios';

import { getDb } from '@/infra/db';
import { PaymentService } from '@/modules/payments/payments.service';

import { ADDRESS, api, findVariant, registerUser, teardown } from '../helpers';

jest.mock('axios');
const mockedPost = axios.post as jest.MockedFunction<typeof axios.post>;

afterAll(teardown);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const sign = (oid: string, status: string, total: string) =>
  createHmac('sha256', 'test-merchant-key').update(oid + 'test-merchant-salt' + status + total).digest('base64');

function callback(fields: Record<string, string>) {
  return api().post('/api/v1/payments/paytr/callback').type('form').send(fields);
}

async function placeCardOrder(quantity = 1) {
  const token = await registerUser();
  const variant = await findVariant({ minStock: 3 });
  await api().post('/api/v1/cart/items').set(auth(token)).send({ variantId: variant.id, quantity }).expect(201);
  mockedPost.mockResolvedValueOnce({ data: { status: 'success', token: `tok${Date.now()}` } });
  const res = await api()
    .post('/api/v1/orders')
    .set(auth(token))
    .set('X-Forwarded-For', '85.34.78.112')
    .send({ paymentMethod: 'card', address: ADDRESS, acceptTerms: true })
    .expect(201);
  return { token, variant, res, order: res.body.order, payment: res.body.payment };
}

beforeEach(() => mockedPost.mockReset());

describe('PayTR ödeme akışı', () => {
  it('kart siparişi iframe URL döner, stok rezerve edilir, sepet korunur', async () => {
    const { token, variant, order, payment } = await placeCardOrder(2);
    expect(order).toMatchObject({ status: 'pending_payment', paymentStatus: 'pending' });
    expect(order.paymentExpiresAt).toEqual(expect.any(String));
    expect(payment).toMatchObject({ type: 'iframe', provider: 'paytr', merchantOid: `${order.orderNo}P1` });
    expect(payment.iframeUrl).toMatch(/^https:\/\/www\.paytr\.com\/odeme\/guvenli\/tok\d+$/);

    // PayTR'ye gönderilen form ve imza
    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe('https://www.paytr.com/odeme/api/get-token');
    const form = new URLSearchParams(body as string);
    expect(form.get('merchant_id')).toBe('999999');
    expect(form.get('user_ip')).toBe('85.34.78.112');
    expect(form.get('payment_amount')).toBe(String(Math.round(order.total * 100)));
    expect(form.get('test_mode')).toBe('1');
    expect(form.get('merchant_ok_url')).toBe(`http://localhost:3000/siparis/${order.orderNo}?odeme=tamam`);
    const expectedToken = createHmac('sha256', 'test-merchant-key')
      .update(
        form.get('merchant_id')! + form.get('user_ip') + form.get('merchant_oid') + form.get('email') + form.get('payment_amount') +
          form.get('user_basket') + form.get('no_installment') + form.get('max_installment') + form.get('currency') + form.get('test_mode') +
          'test-merchant-salt',
      )
      .digest('base64');
    expect(form.get('paytr_token')).toBe(expectedToken);

    const stock = await getDb()('product_variants').where({ id: variant.id }).first();
    expect(stock.stock).toBe(variant.stock - 2);
    const cart = await api().get('/api/v1/cart').set(auth(token)).expect(200);
    expect(cart.body.itemCount).toBe(2);
  });

  it('hatalı imzalı bildirim reddedilir', async () => {
    const { order, payment } = await placeCardOrder();
    const total = String(Math.round(order.total * 100));
    await callback({ merchant_oid: payment.merchantOid, status: 'success', total_amount: total, payment_amount: total, hash: 'sahte' }).expect(400);
    const row = await getDb()('orders').where({ order_no: order.orderNo }).first();
    expect(row.status).toBe('pending_payment');
  });

  it('başarılı bildirim siparişi onaylar, sepeti temizler ve idempotenttir', async () => {
    const { token, order, payment } = await placeCardOrder();
    const total = String(Math.round(order.total * 100));
    const fields = {
      merchant_oid: payment.merchantOid,
      status: 'success',
      total_amount: total,
      payment_amount: total,
      installment_count: '3',
      payment_type: 'card',
      hash: sign(payment.merchantOid, 'success', total),
    };
    const first = await callback(fields).expect(200);
    expect(first.text).toBe('OK');
    await callback(fields).expect(200);

    const detail = await api().get(`/api/v1/orders/${order.orderNo}`).set(auth(token)).expect(200);
    expect(detail.body).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', installmentCount: 3 });
    expect(detail.body.paidAt).toEqual(expect.any(String));
    const payments = await getDb()('payments').where({ merchant_oid: payment.merchantOid });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe('succeeded');
    const cart = await api().get('/api/v1/cart').set(auth(token)).expect(200);
    expect(cart.body.itemCount).toBe(0);
  });

  it('tutar uyuşmazlığında sipariş onaylanmaz', async () => {
    const { order, payment } = await placeCardOrder();
    const total = '100';
    await callback({ merchant_oid: payment.merchantOid, status: 'success', total_amount: total, payment_amount: total, hash: sign(payment.merchantOid, 'success', total) }).expect(200);
    const row = await getDb()('orders').where({ order_no: order.orderNo }).first();
    expect(row.status).toBe('pending_payment');
    const p = await getDb()('payments').where({ merchant_oid: payment.merchantOid }).first();
    expect(p).toMatchObject({ status: 'failed', failed_reason_code: 'AMOUNT_MISMATCH' });
  });

  it('başarısız ödeme sonrası yeniden denenebilir', async () => {
    const { token, order, payment } = await placeCardOrder();
    const total = String(Math.round(order.total * 100));
    await callback({
      merchant_oid: payment.merchantOid,
      status: 'failed',
      total_amount: total,
      failed_reason_code: '2',
      failed_reason_msg: 'Kart limiti yetersiz',
      hash: sign(payment.merchantOid, 'failed', total),
    }).expect(200);
    const failed = await getDb()('payments').where({ merchant_oid: payment.merchantOid }).first();
    expect(failed).toMatchObject({ status: 'failed', failed_reason_msg: 'Kart limiti yetersiz' });

    mockedPost.mockResolvedValueOnce({ data: { status: 'success', token: 'retrytoken' } });
    const retry = await api().post(`/api/v1/orders/${order.orderNo}/payment`).set(auth(token)).expect(200);
    expect(retry.body).toMatchObject({ type: 'iframe', merchantOid: `${order.orderNo}P2`, iframeUrl: 'https://www.paytr.com/odeme/guvenli/retrytoken' });

    // Başka kullanıcı yeniden deneyemez
    const other = await registerUser();
    await api().post(`/api/v1/orders/${order.orderNo}/payment`).set(auth(other)).expect(404);
  });

  it('PayTR token hatası 502 döner, sipariş yeniden denenebilir kalır', async () => {
    const token = await registerUser();
    const variant = await findVariant({ minStock: 3 });
    await api().post('/api/v1/cart/items').set(auth(token)).send({ variantId: variant.id, quantity: 1 }).expect(201);
    mockedPost.mockResolvedValueOnce({ data: { status: 'failed', reason: 'paytr_token gecersiz' } });
    const res = await api().post('/api/v1/orders').set(auth(token)).send({ paymentMethod: 'card', address: ADDRESS, acceptTerms: true }).expect(502);
    expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    const row = await getDb()('orders').where({ user_id: (await getDb()('users').orderBy('id', 'desc').first()).id }).first();
    expect(row.status).toBe('pending_payment');
  });

  it('süresi dolan ödenmemiş sipariş iptal edilir ve stok iade edilir', async () => {
    const { order, variant } = await placeCardOrder(2);
    await getDb()('orders').where({ order_no: order.orderNo }).update({ payment_expires_at: new Date(Date.now() - 60_000) });
    const expired = await new PaymentService().expireUnpaidOrders();
    expect(expired).toBeGreaterThanOrEqual(1);
    const row = await getDb()('orders').where({ order_no: order.orderNo }).first();
    expect(row).toMatchObject({ status: 'cancelled', payment_status: 'failed' });
    const stock = await getDb()('product_variants').where({ id: variant.id }).first();
    expect(stock.stock).toBe(variant.stock);
  });

  it('süresi dolmuş siparişte yeniden deneme reddedilir', async () => {
    const { token, order } = await placeCardOrder();
    await getDb()('orders').where({ order_no: order.orderNo }).update({ payment_expires_at: new Date(Date.now() - 1000) });
    await api().post(`/api/v1/orders/${order.orderNo}/payment`).set(auth(token)).expect(409);
  });
});
