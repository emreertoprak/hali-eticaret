import { randomInt } from 'node:crypto';

import type { Knex } from 'knex';

import { loadConfig } from '@/config/Config';
import { getDb } from '@/infra/db';
import { AddressService } from '@/modules/addresses/addresses.service';
import { CartRepository } from '@/modules/cart/cart.repository';
import { CartService, toCartItem } from '@/modules/cart/cart.service';
import { calculateTotals } from '@/modules/cart/pricing';
import { PaymentService,type PaymentStart } from '@/modules/payments/payments.service';
import { AppError } from '@/utils/AppError';
import { paginate } from '@/utils/pagination';

import type { CreateOrderBody, OrderDto } from './orders.schemas';

function generateOrderNo(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `HE${ymd}${randomInt(100000, 999999)}`;
}

export const toOrder = (o: any, items: any[]): OrderDto => ({
  orderNo: o.order_no,
  status: o.status,
  paymentMethod: o.payment_method,
  paymentStatus: o.payment_status,
  installmentCount: o.installment_count,
  subtotal: Number(o.subtotal),
  shippingFee: Number(o.shipping_fee),
  total: Number(o.total),
  currency: o.currency,
  shippingAddress: typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address,
  note: o.note,
  createdAt: new Date(o.created_at).toISOString(),
  paidAt: o.paid_at ? new Date(o.paid_at).toISOString() : null,
  paymentExpiresAt: o.payment_expires_at ? new Date(o.payment_expires_at).toISOString() : null,
  carrier: o.carrier ?? null,
  trackingNumber: o.tracking_number ?? null,
  items: items.map((i) => ({
    productId: i.product_id,
    variantId: i.variant_id,
    name: i.product_name,
    slug: i.product_slug,
    imageUrl: i.image_url,
    sku: i.sku,
    sizeLabel: i.size_label,
    unitPrice: Number(i.unit_price),
    quantity: i.quantity,
    lineTotal: Number(i.line_total),
  })),
});

export class OrderService {
  constructor(
    private readonly db: () => Knex = getDb,
    private readonly carts = new CartService(),
    private readonly cartRepo = new CartRepository(),
    private readonly addresses = new AddressService(),
    private readonly payments = new PaymentService(),
  ) {}

  /**
   * Sepetten sipariş oluşturur. Stok her iki yöntemde de sipariş anında rezerve edilir.
   * - Kart: sipariş `pending_payment` olarak açılır, sepet ödeme onaylanınca temizlenir ve
   *   ödeme sağlayıcısı (PayTR iframe / mock) başlatılır. Süresi dolan ödemeler iptal edilir.
   * - Havale: sipariş `pending_payment` olarak açılır, sepet hemen temizlenir; onay yöneticidedir.
   */
  async create(
    userId: number,
    body: CreateOrderBody,
    cartToken: string | undefined,
    userIp: string,
  ): Promise<{ order: OrderDto; payment: PaymentStart | null }> {
    const cart = await this.carts.resolve({ userId, token: cartToken }, false);
    if (!cart) throw AppError.badRequest('Sepetiniz boş.');

    const address = body.addressId
      ? await this.addresses.get(userId, body.addressId)
      : { ...body.address!, title: 'Teslimat' };
    const { commerce, payment } = loadConfig();

    const orderId = await this.db().transaction(async (trx) => {
      const lines = (await this.cartRepo.lines(cart.id, trx)).map(toCartItem);
      if (!lines.length) throw AppError.badRequest('Sepetiniz boş.');

      // Satırları kilitleyerek stok yarışını engelle.
      const variants = await trx('product_variants as v')
        .join('products as p', 'p.id', 'v.product_id')
        .whereIn('v.id', lines.map((l) => l.variantId))
        .forUpdate()
        .select('v.id', 'v.stock', 'v.is_active', 'p.is_active as product_active');
      const byId = new Map(variants.map((v: any) => [v.id, v]));
      const problems = lines
        .filter((l) => {
          const v: any = byId.get(l.variantId);
          return !v || !v.is_active || !v.product_active || v.stock < l.quantity;
        })
        .map((l) => ({ itemId: l.id, name: l.name, sizeLabel: l.sizeLabel, stock: (byId.get(l.variantId) as any)?.stock ?? 0 }));
      if (problems.length) throw AppError.conflict('Sepetinizdeki bazı ürünlerin stoğu yetersiz.', problems);

      const totals = calculateTotals(lines, commerce);
      const isCard = body.paymentMethod === 'card';

      const [id] = await trx('orders').insert({
        order_no: generateOrderNo(),
        user_id: userId,
        status: 'pending_payment',
        payment_method: body.paymentMethod,
        payment_status: 'pending',
        installment_count: 1,
        payment_expires_at: isCard ? new Date(Date.now() + payment.pendingOrderTtlMinutes * 60_000) : null,
        subtotal: totals.subtotal,
        shipping_fee: totals.shippingFee,
        total: totals.total,
        currency: commerce.currency,
        shipping_address: JSON.stringify(address),
        note: body.note ?? null,
      });
      await trx('order_items').insert(
        lines.map((l) => ({
          order_id: id,
          product_id: l.productId,
          variant_id: l.variantId,
          product_name: l.name,
          product_slug: l.slug,
          image_url: l.imageUrl,
          sku: l.sku,
          size_label: l.sizeLabel,
          unit_price: l.unitPrice,
          quantity: l.quantity,
          line_total: l.lineTotal,
        })),
      );
      for (const l of lines) {
        await trx('product_variants').where('id', l.variantId).decrement('stock', l.quantity);
      }
      if (!isCard) await this.cartRepo.clear(cart.id, trx);
      return id;
    });

    const paymentStart = body.paymentMethod === 'card' ? await this.payments.initiate(orderId, userIp) : null;
    return { order: await this.findById(orderId), payment: paymentStart };
  }

  /** Bekleyen kart siparişi için yeni ödeme denemesi (ör. başarısız ödeme sonrası). */
  async retryPayment(userId: number, orderNo: string, userIp: string): Promise<PaymentStart> {
    const order = await this.db()('orders').where({ order_no: orderNo, user_id: userId }).first();
    if (!order) throw AppError.notFound('Sipariş bulunamadı.');
    return this.payments.initiate(order.id, userIp);
  }

  private async findById(id: number): Promise<OrderDto> {
    const order = await this.db()('orders').where({ id }).first();
    const items = await this.db()('order_items').where({ order_id: id }).orderBy('id');
    return toOrder(order, items);
  }

  async list(userId: number, page: number, limit: number) {
    const base = this.db()('orders').where({ user_id: userId });
    const [{ total }] = await base.clone().count({ total: '*' });
    const orders = await base.clone().orderBy('created_at', 'desc').orderBy('id', 'desc').limit(limit).offset((page - 1) * limit);
    const items = orders.length ? await this.db()('order_items').whereIn('order_id', orders.map((o: any) => o.id)).orderBy('id') : [];
    return paginate(
      orders.map((o: any) => toOrder(o, items.filter((i: any) => i.order_id === o.id))),
      Number(total),
      page,
      limit,
    );
  }

  async get(userId: number | null, orderNo: string): Promise<OrderDto> {
    const order = await this.db()('orders')
      .where({ order_no: orderNo })
      .modify((qb) => {
        if (userId !== null) qb.andWhere({ user_id: userId });
      })
      .first();
    if (!order) throw AppError.notFound('Sipariş bulunamadı.');
    return this.findById(order.id);
  }
}
