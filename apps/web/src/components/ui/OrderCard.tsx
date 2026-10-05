import Image from 'next/image';
import Link from 'next/link';

import { formatDate, formatPrice, ORDER_STATUS_LABELS } from '@/lib/format';
import type { Order } from '@/lib/types';

const STATUS_STYLE: Record<string, string> = {
  pending_payment: 'bg-gold/30 text-ink',
  confirmed: 'bg-[#e3f3ea] text-[#1d7a46]',
  preparing: 'bg-[#e6eef7] text-[#1f2f55]',
  shipped: 'bg-[#e6eef7] text-[#1f2f55]',
  delivered: 'bg-[#e3f3ea] text-[#1d7a46]',
  cancelled: 'bg-brand-red/10 text-brand-red-deep',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${STATUS_STYLE[status] ?? ''}`}>{ORDER_STATUS_LABELS[status] ?? status}</span>;
}

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/siparis/${order.orderNo}`} className="block rounded-xl border border-line bg-white p-5 shadow-card transition hover:shadow-card-hover">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">#{order.orderNo}</p>
          <p className="text-[13px] text-muted">{formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex -space-x-3">
          {order.items.slice(0, 4).map((i) => (
            <span key={`${i.sku}`} className="relative size-12 overflow-hidden rounded-full border-2 border-white bg-cream">
              {i.imageUrl && <Image src={i.imageUrl} alt="" fill unoptimized sizes="48px" className="object-cover" />}
            </span>
          ))}
        </div>
        <p className="font-extrabold">{formatPrice(order.total)}</p>
      </div>
    </Link>
  );
}
