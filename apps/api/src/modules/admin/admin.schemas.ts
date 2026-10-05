import '@/openapi/registry';

import { z } from 'zod';

import { ORDER_STATUSES } from '@/modules/orders/orders.schemas';

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir.').max(140);
const url = z.string().trim().min(1).max(500);
const money = z.number().positive().multipleOf(0.01);

export const categoryInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slug.optional(),
    parentId: z.number().int().positive().nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    imageUrl: url.nullable().optional(),
    sortOrder: z.number().int().default(0),
    showInStories: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .openapi('AdminCategoryInput');

export const collectionInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slug.optional(),
    description: z.string().max(5000).nullable().optional(),
    imageUrl: url.nullable().optional(),
    bannerUrl: url.nullable().optional(),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })
  .openapi('AdminCollectionInput');

export const bannerInput = z
  .object({
    title: z.string().trim().min(1).max(160),
    subtitle: z.string().max(255).nullable().optional(),
    imageUrl: url,
    mobileImageUrl: url.nullable().optional(),
    ctaText: z.string().max(60).nullable().optional(),
    ctaUrl: z.string().max(255).nullable().optional(),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .openapi('AdminBannerInput');

export const announcementInput = z
  .object({
    placement: z.enum(['top', 'promo']).default('top'),
    text: z.string().trim().min(1).max(255),
    url: z.string().max(255).nullable().optional(),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })
  .openapi('AdminAnnouncementInput');

export const variantInput = z
  .object({
    id: z.number().int().positive().optional(),
    sku: z.string().trim().min(2).max(80),
    widthCm: z.number().int().min(20).max(2000),
    lengthCm: z.number().int().min(20).max(5000),
    sizeLabel: z.string().trim().max(40).optional(),
    price: money,
    discountPrice: money.nullable().optional(),
    stock: z.number().int().min(0),
    isActive: z.boolean().default(true),
  })
  .refine((v) => !v.discountPrice || v.discountPrice < v.price, {
    message: 'İndirimli fiyat liste fiyatından düşük olmalı.',
    path: ['discountPrice'],
  });

export const productInput = z
  .object({
    categoryId: z.number().int().positive(),
    name: z.string().trim().min(2).max(200),
    slug: slug.optional(),
    skuBase: z.string().trim().min(2).max(60),
    description: z.string().max(20000).nullable().optional(),
    material: z.string().max(120).nullable().optional(),
    pileHeight: z.string().max(40).nullable().optional(),
    origin: z.string().max(60).nullable().optional(),
    color: z.string().max(60).nullable().optional(),
    care: z.string().max(5000).nullable().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    images: z.array(z.object({ url, alt: z.string().max(200).nullable().optional() })).max(20).default([]),
    variants: z.array(variantInput).min(1, 'En az bir ebat seçeneği gerekli.'),
    collectionIds: z.array(z.number().int().positive()).default([]),
  })
  .openapi('AdminProductInput');

export const adminListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
});

export const orderStatusBody = z
  .object({
    status: z.enum(ORDER_STATUSES),
    carrier: z.string().trim().min(2).max(60).optional(),
    trackingNumber: z.string().trim().min(3).max(80).optional(),
  })
  .refine((b) => b.status !== 'shipped' || (b.carrier && b.trackingNumber), {
    message: 'Kargoya verirken kargo firması ve takip numarası gerekli.',
    path: ['trackingNumber'],
  })
  .openapi('AdminOrderStatusInput');

export const statsQuery = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });

export type ProductInput = z.infer<typeof productInput>;
