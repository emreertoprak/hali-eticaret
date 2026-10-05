import type { Knex } from 'knex';

import { getDb } from '@/infra/db';

/** Türkiye UTC+3 (yaz saati uygulaması yok); günlük gruplama yerel güne göre yapılır. */
const TR_OFFSET_HOURS = 3;
const LOW_STOCK_THRESHOLD = 3;

const localDay = (column: string) => `DATE(DATE_ADD(${column}, INTERVAL ${TR_OFFSET_HOURS} HOUR))`;

function dayKey(date: Date): string {
  return new Date(date.getTime() + TR_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

export class StatsService {
  constructor(private readonly db: () => Knex = getDb) {}

  /** Ciroya sayılan siparişler: ödemesi alınmış ve iptal edilmemiş. */
  private paidOrders() {
    return this.db()('orders').where('payment_status', 'paid').whereNot('status', 'cancelled');
  }

  private async revenueSince(since: Date) {
    const row = await this.paidOrders()
      .clone()
      .where(this.db().raw('COALESCE(paid_at, created_at)'), '>=', since)
      .first(this.db().raw('COALESCE(SUM(total), 0) as revenue'), this.db().raw('COUNT(*) as orders'));
    return { revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
  }

  async overview(days: number) {
    const db = this.db();
    const now = new Date();
    const startOfToday = new Date(`${dayKey(now)}T00:00:00+03:00`);
    const since = (d: number) => new Date(startOfToday.getTime() - (d - 1) * 86_400_000);

    const [today, last7, lastN, statusRows, pendingPayment, seriesRows, topProducts, lowStock, recentOrders, customers, activeProducts] =
      await Promise.all([
        this.revenueSince(startOfToday),
        this.revenueSince(since(7)),
        this.revenueSince(since(days)),
        db('orders').groupBy('status').select('status').count({ count: '*' }),
        db('orders').where('status', 'pending_payment').first(db.raw('COUNT(*) as count'), db.raw('COALESCE(SUM(total),0) as total')),
        this.paidOrders()
          .clone()
          .where(db.raw('COALESCE(paid_at, created_at)'), '>=', since(days))
          .groupBy('day')
          .select(
            db.raw(`DATE_FORMAT(${localDay('COALESCE(paid_at, created_at)')}, '%Y-%m-%d') as day`),
            db.raw('SUM(total) as revenue'),
            db.raw('COUNT(*) as orders'),
          ),
        db('order_items as oi')
          .join('orders as o', 'o.id', 'oi.order_id')
          .where('o.payment_status', 'paid')
          .whereNot('o.status', 'cancelled')
          .where(db.raw('COALESCE(o.paid_at, o.created_at)'), '>=', since(days))
          .groupBy('oi.product_id', 'oi.product_name', 'oi.product_slug')
          .select('oi.product_id', 'oi.product_name as name', 'oi.product_slug as slug')
          .sum({ quantity: 'oi.quantity', revenue: 'oi.line_total' })
          .orderBy('revenue', 'desc')
          .limit(5),
        db('product_variants as v')
          .join('products as p', 'p.id', 'v.product_id')
          .where({ 'v.is_active': true, 'p.is_active': true })
          .andWhere('v.stock', '<=', LOW_STOCK_THRESHOLD)
          .orderBy([{ column: 'v.stock' }, { column: 'p.name' }])
          .limit(10)
          .select('v.id', 'v.sku', 'v.size_label', 'v.stock', 'p.id as product_id', 'p.name'),
        db('orders as o')
          .join('users as u', 'u.id', 'o.user_id')
          .orderBy('o.id', 'desc')
          .limit(6)
          .select('o.id', 'o.order_no', 'o.status', 'o.payment_status', 'o.total', 'o.created_at', 'u.email'),
        db('users').where('role', 'customer').first(db.raw('COUNT(*) as count')),
        db('products').where('is_active', true).first(db.raw('COUNT(*) as count')),
      ]);

    // Grafik için boş günleri sıfırla doldur.
    const byDay = new Map(seriesRows.map((r: any) => [String(r.day), r]));
    const series = Array.from({ length: days }, (_, i) => {
      const key = dayKey(new Date(since(days).getTime() + i * 86_400_000));
      const row: any = byDay.get(key);
      return { day: key, revenue: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
    });

    return {
      days,
      revenue: { today, last7Days: last7, period: lastN },
      averageOrderValue: lastN.orders ? Math.round((lastN.revenue / lastN.orders) * 100) / 100 : 0,
      ordersByStatus: Object.fromEntries(statusRows.map((r: any) => [r.status, Number(r.count)])),
      pendingPayment: { count: Number(pendingPayment?.count ?? 0), total: Number(pendingPayment?.total ?? 0) },
      series,
      topProducts: topProducts.map((t: any) => ({ productId: t.product_id, name: t.name, slug: t.slug, quantity: Number(t.quantity), revenue: Number(t.revenue) })),
      lowStock: lowStock.map((v: any) => ({ variantId: v.id, productId: v.product_id, name: v.name, sku: v.sku, sizeLabel: v.size_label, stock: v.stock })),
      recentOrders: recentOrders.map((o: any) => ({
        id: o.id,
        orderNo: o.order_no,
        status: o.status,
        paymentStatus: o.payment_status,
        total: Number(o.total),
        email: o.email,
        createdAt: new Date(o.created_at).toISOString(),
      })),
      customers: Number(customers?.count ?? 0),
      activeProducts: Number(activeProducts?.count ?? 0),
    };
  }
}
