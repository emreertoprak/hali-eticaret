import { formatPrice } from '@/lib/format';
import type { Cart } from '@/lib/types';

export function CartSummary({ cart }: { cart: Cart }) {
  const remaining = cart.freeShippingThreshold - cart.subtotal;
  return (
    <dl className="space-y-2 text-[14px]">
      <div className="flex justify-between">
        <dt className="text-muted">Ara Toplam</dt>
        <dd className="font-semibold">{formatPrice(cart.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">Kargo</dt>
        <dd className="font-semibold">{cart.shippingFee === 0 ? <span className="text-[#1d7a46]">Ücretsiz</span> : formatPrice(cart.shippingFee)}</dd>
      </div>
      {remaining > 0 && cart.subtotal > 0 && (
        <p className="rounded-lg bg-cream px-3 py-2 text-[12px]">
          Ücretsiz kargo için <strong>{formatPrice(remaining)}</strong> daha ekleyin.
        </p>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-[17px]">
        <dt className="font-bold">Toplam</dt>
        <dd className="font-extrabold">{formatPrice(cart.total)}</dd>
      </div>
      <p className="rounded-lg bg-gold/25 px-3 py-2 text-[12px]">
        {cart.maxInstallment > 1 ? (
          <>
            Bu sipariş için <strong>{cart.maxInstallment} taksit</strong> vade farksız!
          </>
        ) : (
          <>10.000 TL üzeri 3, 15.000 TL üzeri 5 vade farksız taksit.</>
        )}
      </p>
    </dl>
  );
}
