const priceFormatter = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 4250 → "4.250,00 TL" */
export const formatPrice = (value: number): string => `${priceFormatter.format(value)} TL`;

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Ödeme Bekleniyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoya Verildi',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Edildi',
};

export function maxInstallment(total: number, rules: { minTotal: number; maxCount: number }[]): number {
  return [...rules].sort((a, b) => b.minTotal - a.minTotal).find((r) => total > r.minTotal)?.maxCount ?? 1;
}
