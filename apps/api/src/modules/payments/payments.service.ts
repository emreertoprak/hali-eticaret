import type { Knex } from 'knex';

import { loadConfig } from '@/config/Config';
import { getDb } from '@/infra/db';
import { getLogger } from '@/infra/logger';
import { maxInstallmentFor } from '@/modules/cart/pricing';
import { restoreStock } from '@/modules/orders/stock';
import { AppError } from '@/utils/AppError';

import { requestIframeToken, toKurus, verifyCallbackHash } from './paytr';

const logger = getLogger('payments');

export type PaymentStart =
  | { type: 'iframe'; provider: 'paytr'; merchantOid: string; iframeUrl: string }
  | { type: 'completed'; provider: 'mock'; merchantOid: string };

export interface PaytrCallbackBody {
  merchant_oid?: string;
  status?: string;
  total_amount?: string;
  payment_amount?: string;
  hash?: string;
  installment_count?: string;
  payment_type?: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  test_mode?: string;
  currency?: string;
}

/** PayTR yalnızca IPv4 kabul eder; Express'in IPv6-mapped adreslerini sadeleştirir. */
export const normalizeIp = (ip: string | undefined): string => (ip ?? '127.0.0.1').replace(/^::ffff:/, '').replace(/^::1$/, '127.0.0.1');

export class PaymentService {
  constructor(private readonly db: () => Knex = getDb) {}

  /** Kart siparişi için yeni bir ödeme denemesi başlatır. */
  async initiate(orderId: number, userIp: string): Promise<PaymentStart> {
    const config = loadConfig();
    const order = await this.db()('orders as o')
      .join('users as u', 'u.id', 'o.user_id')
      .where('o.id', orderId)
      .first('o.*', 'u.email', 'u.first_name', 'u.last_name', 'u.phone as user_phone');
    if (!order) throw AppError.notFound('Sipariş bulunamadı.');
    if (order.payment_method !== 'card' || order.status !== 'pending_payment') {
      throw AppError.conflict('Bu sipariş için ödeme başlatılamaz.');
    }
    if (order.payment_expires_at && new Date(order.payment_expires_at).getTime() < Date.now()) {
      throw AppError.conflict('Ödeme süresi doldu, lütfen yeni sipariş oluşturun.');
    }

    const [{ attempts }] = await this.db()('payments').where({ order_id: orderId }).count({ attempts: '*' });
    const merchantOid = `${order.order_no}P${Number(attempts) + 1}`;
    const provider = config.payment.provider;
    const [paymentId] = await this.db()('payments').insert({
      order_id: orderId,
      provider,
      merchant_oid: merchantOid,
      amount: order.total,
      currency: order.currency,
    });

    if (provider === 'mock') {
      // Geliştirme/test: sağlayıcı yok, ödeme anında başarılı sayılır.
      await this.markSucceeded(merchantOid, { installmentCount: 1, paymentType: 'card', payload: { mock: true } });
      return { type: 'completed', provider: 'mock', merchantOid };
    }

    const items = await this.db()('order_items').where({ order_id: orderId });
    const address = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
    try {
      const { iframeUrl } = await requestIframeToken(config.payment.paytr, {
        userIp,
        merchantOid,
        email: order.email,
        amount: Number(order.total),
        basket: [
          ...items.map((i: any) => ({ name: `${i.product_name} (${i.size_label})`, unitPrice: Number(i.unit_price), quantity: i.quantity })),
          ...(Number(order.shipping_fee) > 0 ? [{ name: 'Kargo', unitPrice: Number(order.shipping_fee), quantity: 1 }] : []),
        ],
        maxInstallment: maxInstallmentFor(Number(order.total), config.commerce.installments),
        userName: address.fullName ?? `${order.first_name} ${order.last_name}`,
        userAddress: `${address.addressLine} ${address.district}/${address.city}`,
        userPhone: address.phone ?? order.user_phone ?? '',
        okUrl: `${config.publicWebUrl}/siparis/${order.order_no}?odeme=tamam`,
        failUrl: `${config.publicWebUrl}/siparis/${order.order_no}?odeme=hata`,
      });
      return { type: 'iframe', provider: 'paytr', merchantOid, iframeUrl };
    } catch (err) {
      await this.db()('payments')
        .where({ id: paymentId })
        .update({ status: 'failed', failed_reason_msg: 'Token alınamadı', updated_at: this.db().fn.now() });
      throw err;
    }
  }

  /** PayTR bildirimi. Aynı bildirim birden çok kez gelebilir; işlem idempotenttir. */
  async handlePaytrCallback(body: PaytrCallbackBody): Promise<void> {
    const { merchantKey, merchantSalt } = loadConfig().payment.paytr;
    if (!verifyCallbackHash(body, merchantKey, merchantSalt)) {
      logger.warn(`PayTR bildirimi hatalı hash ile reddedildi (oid=${body.merchant_oid})`);
      throw AppError.badRequest('PAYTR notification failed: bad hash');
    }
    const payment = await this.db()('payments').where({ merchant_oid: body.merchant_oid }).first();
    if (!payment) {
      logger.error(`PayTR bildirimi bilinmeyen ödeme için geldi: ${body.merchant_oid}`);
      return;
    }

    if (body.status === 'success') {
      if (Number(body.payment_amount) !== toKurus(Number(payment.amount))) {
        logger.error(`Tutar uyuşmazlığı oid=${body.merchant_oid} beklenen=${toKurus(Number(payment.amount))} gelen=${body.payment_amount}`);
        await this.markFailed(body.merchant_oid!, { code: 'AMOUNT_MISMATCH', message: 'Ödenen tutar sipariş tutarıyla uyuşmuyor', payload: body });
        return;
      }
      await this.markSucceeded(body.merchant_oid!, {
        installmentCount: Number(body.installment_count) || 1,
        paymentType: body.payment_type ?? 'card',
        payload: body,
      });
    } else {
      await this.markFailed(body.merchant_oid!, { code: body.failed_reason_code, message: body.failed_reason_msg, payload: body });
    }
  }

  async markSucceeded(merchantOid: string, info: { installmentCount: number; paymentType: string; payload: unknown }): Promise<void> {
    await this.db().transaction(async (trx) => {
      const payment = await trx('payments').where({ merchant_oid: merchantOid }).forUpdate().first();
      if (!payment || payment.status === 'succeeded') return;
      const order = await trx('orders').where({ id: payment.order_id }).forUpdate().first();

      await trx('payments').where({ id: payment.id }).update({
        status: 'succeeded',
        installment_count: info.installmentCount,
        payment_type: info.paymentType,
        callback_payload: JSON.stringify(info.payload),
        updated_at: trx.fn.now(),
      });

      if (order.status === 'pending_payment') {
        await trx('orders').where({ id: order.id }).update({
          status: 'confirmed',
          payment_status: 'paid',
          paid_at: trx.fn.now(),
          installment_count: info.installmentCount,
          updated_at: trx.fn.now(),
        });
      } else {
        // Ör. süre aşımıyla iptal edildikten sonra gelen başarılı ödeme: manuel iade gerekir.
        logger.error(`Sipariş ${order.order_no} "${order.status}" durumundayken ödeme alındı; manuel kontrol/iade gerekli.`);
        await trx('orders').where({ id: order.id }).update({ payment_status: 'paid', paid_at: trx.fn.now(), updated_at: trx.fn.now() });
      }

      // Satın alınan ebatları kullanıcının sepetinden düş.
      const cart = await trx('carts').where({ user_id: order.user_id }).first();
      if (cart) {
        const variantIds = await trx('order_items').where({ order_id: order.id }).whereNotNull('variant_id').pluck('variant_id');
        if (variantIds.length) await trx('cart_items').where({ cart_id: cart.id }).whereIn('variant_id', variantIds).delete();
      }
    });
  }

  async markFailed(merchantOid: string, info: { code?: string; message?: string; payload: unknown }): Promise<void> {
    await this.db()('payments')
      .where({ merchant_oid: merchantOid, status: 'initiated' })
      .update({
        status: 'failed',
        failed_reason_code: info.code?.slice(0, 20) ?? null,
        failed_reason_msg: info.message?.slice(0, 255) ?? null,
        callback_payload: JSON.stringify(info.payload),
        updated_at: this.db().fn.now(),
      });
  }

  /** Süresi dolan ödenmemiş kart siparişlerini iptal eder ve stokları iade eder. */
  async expireUnpaidOrders(now = new Date()): Promise<number> {
    const due = await this.db()('orders')
      .where({ status: 'pending_payment', payment_method: 'card' })
      .andWhere('payment_expires_at', '<', now)
      .pluck('id');
    let expired = 0;
    for (const id of due) {
      await this.db().transaction(async (trx) => {
        const order = await trx('orders').where({ id }).forUpdate().first();
        if (order?.status !== 'pending_payment') return;
        await trx('orders').where({ id }).update({ status: 'cancelled', payment_status: 'failed', updated_at: trx.fn.now() });
        await trx('payments').where({ order_id: id, status: 'initiated' }).update({ status: 'failed', failed_reason_msg: 'Süre aşımı', updated_at: trx.fn.now() });
        await restoreStock(trx, id);
        expired++;
      });
    }
    if (expired) logger.info(`${expired} ödenmemiş sipariş süre aşımıyla iptal edildi.`);
    return expired;
  }
}
