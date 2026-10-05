import '@/openapi/registry';

import { z } from 'zod';

export const MAX_QUANTITY_PER_LINE = 20;

export const addItemBody = z
  .object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE).default(1),
  })
  .openapi('AddCartItemRequest');

export const updateItemBody = z
  .object({ quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE) })
  .openapi('UpdateCartItemRequest');

export const cartItemSchema = z.object({
  id: z.number(),
  variantId: z.number(),
  productId: z.number(),
  name: z.string(),
  slug: z.string(),
  imageUrl: z.string().nullable(),
  sku: z.string(),
  sizeLabel: z.string(),
  unitPrice: z.number(),
  oldUnitPrice: z.number().nullable(),
  quantity: z.number(),
  lineTotal: z.number(),
  stock: z.number(),
  available: z.boolean(),
});

export const cartSchema = z
  .object({
    token: z.string(),
    items: z.array(cartItemSchema),
    itemCount: z.number(),
    subtotal: z.number(),
    shippingFee: z.number(),
    total: z.number(),
    maxInstallment: z.number(),
    freeShippingThreshold: z.number(),
  })
  .openapi('Cart');

export type CartDto = z.infer<typeof cartSchema>;
export type CartItemDto = z.infer<typeof cartItemSchema>;
