export interface CategoryDto {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount?: number;
}

export interface CollectionDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  isFeatured: boolean;
}

export interface ProductListItemDto {
  id: number;
  name: string;
  slug: string;
  category: { name: string; slug: string };
  imageUrl: string | null;
  hoverImageUrl: string | null;
  price: number;
  oldPrice: number | null;
  discountRate: number | null;
  sizes: string[];
  inStock: boolean;
  isFeatured: boolean;
}

export interface VariantDto {
  id: number;
  sku: string;
  sizeLabel: string;
  widthCm: number;
  lengthCm: number;
  price: number;
  oldPrice: number | null;
  stock: number;
  inStock: boolean;
}

export interface ProductDetailDto extends Omit<ProductListItemDto, 'imageUrl' | 'hoverImageUrl' | 'sizes'> {
  skuBase: string;
  description: string | null;
  material: string | null;
  pileHeight: string | null;
  origin: string | null;
  color: string | null;
  care: string | null;
  images: { url: string; alt: string | null }[];
  variants: VariantDto[];
  collections: { name: string; slug: string }[];
}
