import { calculateTotals, maxInstallmentFor } from '@/modules/cart/pricing';

const commerce = {
  currency: 'TRY',
  shippingFee: 149.9,
  freeShippingThreshold: 1500,
  installments: [
    { minTotal: 10000, maxCount: 3 },
    { minTotal: 15000, maxCount: 5 },
  ],
};

describe('maxInstallmentFor', () => {
  it.each([
    [9999.99, 1],
    [10000, 1],
    [10000.01, 3],
    [15000, 3],
    [15000.5, 5],
  ])('%p TL için en fazla %p taksit', (total, expected) => {
    expect(maxInstallmentFor(total, commerce.installments)).toBe(expected);
  });
});

describe('calculateTotals', () => {
  it('eşik altında kargo ücreti ekler', () => {
    const t = calculateTotals([{ unitPrice: 499.9, quantity: 2 }], commerce);
    expect(t).toEqual({ subtotal: 999.8, shippingFee: 149.9, total: 1149.7, maxInstallment: 1 });
  });

  it('eşik üstünde kargo ücretsizdir', () => {
    const t = calculateTotals([{ unitPrice: 1500, quantity: 1 }], commerce);
    expect(t.shippingFee).toBe(0);
    expect(t.total).toBe(1500);
  });

  it('boş sepette kargo ücreti yoktur', () => {
    expect(calculateTotals([], commerce)).toEqual({ subtotal: 0, shippingFee: 0, total: 0, maxInstallment: 1 });
  });

  it('kuruş hassasiyetini korur', () => {
    const t = calculateTotals(
      [
        { unitPrice: 0.1, quantity: 3 },
        { unitPrice: 0.2, quantity: 1 },
      ],
      commerce,
    );
    expect(t.subtotal).toBe(0.5);
  });
});
