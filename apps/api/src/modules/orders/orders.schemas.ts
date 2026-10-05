import '@/openapi/registry';

import { z } from 'zod';

import { addressBody } from '@/modules/addresses/addresses.schemas';

export const ORDER_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;

const cardSchema = z.object({
  holderName: z.string().trim().min(3).max(100),
  number: z.string().regex(/^[0-9 ]{15,23}$/, 'Geçersiz kart numarası.'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, 'SKT AA/YY formatında olmalı.'),
  cvv: z.string().regex(/^[0-9]{3,4}$/),
});

export const createOrderBody = z
  .object({
    addressId: z.number().int().positive().optional(),
    address: addressBody.omit({ title: true, isDefault: true }).optional(),
    paymentMethod: z.enum(['card', 'bank_transfer']),
    installmentCount: z.number().int().min(1).max(12).default(1),
    card: cardSchema.optional(),
    note: z.string().trim().max(500).optional(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Mesafeli satış sözleşmesi onaylanmalı.' }) }),
  })
  .refine((b) => b.addressId || b.address, { message: 'Teslimat adresi gerekli.', path: ['address'] })
  .refine((b) => b.paymentMethod !== 'card' || b.card, { message: 'Kart bilgileri gerekli.', path: ['card'] })
  .openapi('CreateOrderRequest');

export const orderListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const orderNoParams = z.object({ orderNo: z.string().regex(/^[A-Z0-9]{6,20}$/) });

export const orderItemSchema = z.object({
  productId: z.number().nullable(),
  variantId: z.number().nullable(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().nullable(),
  sku: z.string(),
  sizeLabel: z.string(),
  unitPrice: z.number(),
  quantity: z.number(),
  lineTotal: z.number(),
});

export const orderSchema = z
  .object({
    orderNo: z.string(),
    status: z.enum(ORDER_STATUSES),
    paymentMethod: z.enum(['card', 'bank_transfer']),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
    installmentCount: z.number(),
    subtotal: z.number(),
    shippingFee: z.number(),
    total: z.number(),
    currency: z.string(),
    shippingAddress: z.record(z.any()),
    note: z.string().nullable(),
    createdAt: z.string(),
    items: z.array(orderItemSchema),
  })
  .openapi('Order');

export type CreateOrderBody = z.infer<typeof createOrderBody>;
export type OrderDto = z.infer<typeof orderSchema>;
