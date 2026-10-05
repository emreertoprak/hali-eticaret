import type { ProductRow } from './catalog.repository';
import type { CategoryDto, CollectionDto, ProductListItemDto, VariantDto } from './catalog.types';

export function discountRate(price: number, oldPrice: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export const toCategory = (r: any): CategoryDto => ({
  id: r.id,
  parentId: r.parent_id ?? null,
  name: r.name,
  slug: r.slug,
  description: r.description ?? null,
  imageUrl: r.image_url ?? null,
  ...(r.product_count !== undefined ? { productCount: Number(r.product_count) } : {}),
});

export const toCollection = (r: any): CollectionDto => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  description: r.description ?? null,
  imageUrl: r.image_url ?? null,
  bannerUrl: r.banner_url ?? null,
  isFeatured: Boolean(r.is_featured),
});

export const toProductListItem = (r: ProductRow): ProductListItemDto => {
  const price = Number(r.min_price);
  const oldPrice = r.min_price_old === null ? null : Number(r.min_price_old);
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    category: { name: r.category_name, slug: r.category_slug },
    imageUrl: r.image_url,
    hoverImageUrl: r.hover_image_url,
    price,
    oldPrice: discountRate(price, oldPrice) ? oldPrice : null,
    discountRate: discountRate(price, oldPrice),
    sizes: r.sizes ? r.sizes.split(',') : [],
    inStock: Number(r.total_stock) > 0,
    isFeatured: Boolean(r.is_featured),
  };
};

export const toVariant = (r: any): VariantDto => {
  const hasDiscount = r.discount_price !== null && Number(r.discount_price) < Number(r.price);
  return {
    id: r.id,
    sku: r.sku,
    sizeLabel: r.size_label,
    widthCm: r.width_cm,
    lengthCm: r.length_cm,
    price: Number(hasDiscount ? r.discount_price : r.price),
    oldPrice: hasDiscount ? Number(r.price) : null,
    stock: r.stock,
    inStock: r.stock > 0,
  };
};
