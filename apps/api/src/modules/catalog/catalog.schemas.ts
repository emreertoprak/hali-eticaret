import '@/openapi/registry';

import { z } from 'zod';

export const SORT_OPTIONS = ['recommended', 'price_asc', 'price_desc', 'newest'] as const;

const csv = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean));

export const productListQueryBase = z.object({
    category: z.string().max(140).optional(),
    collection: z.string().max(140).optional(),
    q: z.string().trim().max(100).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    size: csv.optional().openapi({ type: 'string', description: 'Virgülle ayrılmış ebatlar: 80x150,160x230' }),
    featured: z.enum(['true', 'false']).transform((v) => v === 'true').optional().openapi({ type: 'string' }),
    sort: z.enum(SORT_OPTIONS).default('recommended'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const productListQuery = productListQueryBase.refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: 'minPrice, maxPrice değerinden büyük olamaz.',
    path: ['minPrice'],
  });

export type ProductListQuery = z.infer<typeof productListQuery>;

export const categorySchema = z
  .object({
    id: z.number(),
    parentId: z.number().nullable(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    productCount: z.number().optional(),
  })
  .openapi('Category');

export const collectionSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    bannerUrl: z.string().nullable(),
    isFeatured: z.boolean(),
  })
  .openapi('Collection');

export const productListItemSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    category: z.object({ name: z.string(), slug: z.string() }),
    imageUrl: z.string().nullable(),
    hoverImageUrl: z.string().nullable(),
    price: z.number(),
    oldPrice: z.number().nullable(),
    discountRate: z.number().nullable(),
    sizes: z.array(z.string()),
    inStock: z.boolean(),
    isFeatured: z.boolean(),
  })
  .openapi('ProductListItem');

export const productPageSchema = z
  .object({
    items: z.array(productListItemSchema),
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    facets: z.object({
      sizes: z.array(z.object({ label: z.string(), count: z.number() })),
      priceRange: z.object({ min: z.number(), max: z.number() }),
    }),
  })
  .openapi('ProductPage');

export const variantSchema = z.object({
  id: z.number(),
  sku: z.string(),
  sizeLabel: z.string(),
  widthCm: z.number(),
  lengthCm: z.number(),
  price: z.number(),
  oldPrice: z.number().nullable(),
  stock: z.number(),
  inStock: z.boolean(),
});

export const productDetailSchema = productListItemSchema
  .omit({ imageUrl: true, hoverImageUrl: true, sizes: true })
  .extend({
    skuBase: z.string(),
    description: z.string().nullable(),
    material: z.string().nullable(),
    pileHeight: z.string().nullable(),
    origin: z.string().nullable(),
    color: z.string().nullable(),
    care: z.string().nullable(),
    images: z.array(z.object({ url: z.string(), alt: z.string().nullable() })),
    variants: z.array(variantSchema),
    collections: z.array(z.object({ name: z.string(), slug: z.string() })),
  })
  .openapi('ProductDetail');

export const announcementSchema = z.object({
  id: z.number(),
  placement: z.enum(['top', 'promo']),
  text: z.string(),
  url: z.string().nullable(),
});

export const bannerSchema = z.object({
  id: z.number(),
  title: z.string(),
  subtitle: z.string().nullable(),
  imageUrl: z.string(),
  mobileImageUrl: z.string().nullable(),
  ctaText: z.string().nullable(),
  ctaUrl: z.string().nullable(),
});

export const homeSchema = z
  .object({
    brand: z.object({ name: z.string(), whatsapp: z.string() }),
    announcements: z.array(announcementSchema),
    banners: z.array(bannerSchema),
    storyCategories: z.array(categorySchema),
    featuredCollections: z.array(collectionSchema),
    newArrivals: z.array(productListItemSchema),
    featuredProducts: z.array(productListItemSchema),
    commerce: z.object({
      currency: z.string(),
      freeShippingThreshold: z.number(),
      installments: z.array(z.object({ minTotal: z.number(), maxCount: z.number() })),
    }),
  })
  .openapi('Home');
