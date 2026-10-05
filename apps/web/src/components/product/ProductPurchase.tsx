'use client';

import { CreditCard, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useCart } from '@/context/CartContext';
import { formatPrice, maxInstallment } from '@/lib/format';
import type { InstallmentRule, ProductDetail } from '@/lib/types';

import { WhatsAppIcon } from '../layout/WhatsAppButton';
import { Price } from '../ui/Price';
import { QuantityStepper } from '../ui/QuantityStepper';

export function ProductPurchase({ product, installments, whatsapp }: { product: ProductDetail; installments: InstallmentRule[]; whatsapp: string }) {
  const router = useRouter();
  const { addItem, loading, error } = useCart();
  const firstAvailable = product.variants.find((v) => v.inStock) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [quantity, setQuantity] = useState(1);
  const variant = useMemo(() => product.variants.find((v) => v.id === variantId), [product.variants, variantId]);

  const total = (variant?.price ?? 0) * quantity;
  const installment = maxInstallment(total, installments);
  const maxQty = Math.max(1, Math.min(20, variant?.stock ?? 1));
  const discount = variant?.oldPrice ? Math.round(((variant.oldPrice - variant.price) / variant.oldPrice) * 100) : null;

  const add = async (goCheckout = false) => {
    if (!variant) return;
    try {
      await addItem(variant.id, quantity);
      if (goCheckout) router.push('/odeme');
    } catch {
      /* hata context'te gösterilir */
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {variant && <Price price={variant.price} oldPrice={variant.oldPrice} size="lg" />}
        {discount ? <span className="rounded-full bg-brand-red px-2.5 py-1 text-[12px] font-extrabold text-white">-%{discount}</span> : null}
      </div>

      <p className="rounded-lg border border-gold/60 bg-gold/15 px-4 py-3 text-[13px]">
        <strong>Vade farksız taksit:</strong> 10.000 TL üzeri 3, 15.000 TL üzeri 5 taksit.
        {installment > 1 && (
          <span className="mt-1 block font-semibold">
            Bu seçimde {installment} × {formatPrice(Math.round((total / installment) * 100) / 100)}
          </span>
        )}
      </p>

      <fieldset>
        <legend className="label-eyebrow mb-3">
          Ebat Seçin {variant && <span className="ml-1 font-semibold tracking-normal normal-case text-muted">— {variant.sizeLabel} cm</span>}
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {product.variants.map((v) => (
            <button
              key={v.id}
              role="radio"
              aria-checked={v.id === variantId}
              disabled={!v.inStock}
              onClick={() => {
                setVariantId(v.id);
                setQuantity(1);
              }}
              className={`relative rounded-full border-[1.5px] px-4 py-2 text-[14px] font-semibold transition ${
                v.id === variantId ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink'
              } disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted/60 disabled:line-through`}
            >
              {v.sizeLabel}
              {!v.inStock && <span className="ml-1 text-[10px] no-underline">Tükendi</span>}
            </button>
          ))}
        </div>
        {variant && variant.inStock && variant.stock <= 3 && <p className="mt-2 text-[13px] font-semibold text-brand-red">Son {variant.stock} ürün!</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={quantity} onChange={setQuantity} max={maxQty} disabled={!variant?.inStock} />
        <button className="btn-primary min-w-48 flex-1" disabled={!variant?.inStock || loading} onClick={() => add()}>
          {variant?.inStock ? (loading ? 'Ekleniyor…' : 'Sepete Ekle') : 'Tükendi'}
        </button>
      </div>
      <button className="btn-outline" disabled={!variant?.inStock || loading} onClick={() => add(true)}>
        Hemen Al
      </button>
      {error && (
        <p role="alert" className="text-[13px] font-semibold text-brand-red">
          {error}
        </p>
      )}

      <a
        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`${product.name} (${variant?.sizeLabel ?? ''}) hakkında bilgi almak istiyorum.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-[14px] font-semibold text-[#1d7a46] hover:underline"
      >
        <WhatsAppIcon size={18} /> Sipariş ve bilgi için WhatsApp&apos;tan yazın
      </a>

      <ul className="grid grid-cols-2 gap-3 border-t border-line pt-5 text-[13px]">
        {[
          [Truck, 'Ücretsiz Kargo', '1.500 TL üzeri'],
          [RotateCcw, '14 Gün İade', 'Koşulsuz'],
          [ShieldCheck, 'Güvenli Ödeme', '256-bit SSL'],
          [CreditCard, 'Taksit İmkânı', '5 taksite kadar'],
        ].map(([Icon, title, text]) => {
          const I = Icon as typeof Truck;
          return (
            <li key={title as string} className="flex items-center gap-2">
              <I size={18} strokeWidth={1.7} className="shrink-0" />
              <span>
                <strong className="block">{title as string}</strong>
                <span className="text-muted">{text as string}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
