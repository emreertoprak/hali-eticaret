import '@/openapi/registry';

import { z } from 'zod';

import { addressBody } from '@/modules/addresses/addresses.schemas';

export const ORDER_STATUSES = ['pending_payment', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;

export const createOrderBody = z
  .object({
    addressId: z.number().int().positive().optional(),
    address: addressBody.omit({ title: true, isDefault: true }).optional(),
    // Kart bilgileri bize gelmez; PayTR güvenli ödeme sayfasında girilir, taksit orada seçilir.
    paymentMethod: z.enum(['card', 'bank_transfer']),
    note: z.string().trim().max(500).optional(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Mesafeli satış sözleşmesi onaylanmalı.' }) }),
  })
  .refine((b) => b.addressId || b.address, { message: 'Teslimat adresi gerekli.', path: ['address'] })
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
    paidAt: z.string().nullable(),
    paymentExpiresAt: z.string().nullable(),
    carrier: z.string().nullable(),
    trackingNumber: z.string().nullable(),
    items: z.array(orderItemSchema),
  })
  .openapi('Order');

export type CreateOrderBody = z.infer<typeof createOrderBody>;
export type OrderDto = z.infer<typeof orderSchema>;

export const paymentStartSchema = z
  .object({
    type: z.enum(['iframe', 'completed']),
    provider: z.enum(['paytr', 'mock']),
    merchantOid: z.string(),
    iframeUrl: z.string().optional(),
  })
  .openapi('PaymentStart');

export const createOrderResponse = z
  .object({ order: orderSchema, payment: paymentStartSchema.nullable() })
  .openapi('CreateOrderResponse');
