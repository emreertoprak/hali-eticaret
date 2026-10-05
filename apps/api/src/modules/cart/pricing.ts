import type { AppConfig } from '@/config/Config';
import { roundMoney, sumMoney } from '@/utils/money';

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  shippingFee: number;
  total: number;
  maxInstallment: number;
}

/** Kampanya kuralı: toplam tutar eşiği aşınca vade farksız taksit sayısı artar. */
export function maxInstallmentFor(total: number, rules: AppConfig['commerce']['installments']): number {
  const rule = [...rules].sort((a, b) => b.minTotal - a.minTotal).find((r) => total > r.minTotal);
  return rule?.maxCount ?? 1;
}

export function calculateTotals(lines: PricedLine[], commerce: AppConfig['commerce']): Totals {
  const subtotal = sumMoney(lines.map((l) => l.unitPrice * l.quantity));
  const shippingFee = subtotal === 0 || subtotal >= commerce.freeShippingThreshold ? 0 : commerce.shippingFee;
  const total = roundMoney(subtotal + shippingFee);
  return { subtotal, shippingFee, total, maxInstallment: maxInstallmentFor(total, commerce.installments) };
}
