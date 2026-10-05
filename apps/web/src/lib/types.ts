export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount?: number;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  isFeatured: boolean;
}

export interface ProductListItem {
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

export interface ProductPage {
  items: ProductListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: { sizes: { label: string; count: number }[]; priceRange: { min: number; max: number } };
}

export interface Variant {
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

export interface ProductDetail extends Omit<ProductListItem, 'imageUrl' | 'hoverImageUrl' | 'sizes'> {
  skuBase: string;
  description: string | null;
  material: string | null;
  pileHeight: string | null;
  origin: string | null;
  color: string | null;
  care: string | null;
  images: { url: string; alt: string | null }[];
  variants: Variant[];
  collections: { name: string; slug: string }[];
}

export interface Announcement {
  id: number;
  placement: 'top' | 'promo';
  text: string;
  url: string | null;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
}

export interface InstallmentRule {
  minTotal: number;
  maxCount: number;
}

export interface Home {
  brand: { name: string; whatsapp: string };
  announcements: Announcement[];
  banners: Banner[];
  storyCategories: Category[];
  featuredCollections: Collection[];
  newArrivals: ProductListItem[];
  featuredProducts: ProductListItem[];
  commerce: { currency: string; freeShippingThreshold: number; installments: InstallmentRule[] };
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'customer' | 'admin';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface CartItem {
  id: number;
  variantId: number;
  productId: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  unitPrice: number;
  oldUnitPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  available: boolean;
}

export interface Cart {
  token: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  maxInstallment: number;
  freeShippingThreshold: number;
}

export interface Address {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode: string | null;
  isDefault: boolean;
}

export type OrderStatus = 'pending_payment' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  orderNo: string;
  status: OrderStatus;
  paymentMethod: 'card' | 'bank_transfer';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  installmentCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  shippingAddress: Record<string, string>;
  note: string | null;
  createdAt: string;
  items: {
    productId: number | null;
    variantId: number | null;
    name: string;
    slug: string;
    imageUrl: string | null;
    sku: string;
    sizeLabel: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
