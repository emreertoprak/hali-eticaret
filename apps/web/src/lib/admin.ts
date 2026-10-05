import type { Order, OrderStatus, Paginated } from './types';

export interface AdminStats {
  days: number;
  revenue: { today: Kpi; last7Days: Kpi; period: Kpi };
  averageOrderValue: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  pendingPayment: { count: number; total: number };
  series: { day: string; revenue: number; orders: number }[];
  topProducts: { productId: number | null; name: string; slug: string; quantity: number; revenue: number }[];
  lowStock: { variantId: number; productId: number; name: string; sku: string; sizeLabel: string; stock: number }[];
  recentOrders: { id: number; orderNo: string; status: OrderStatus; paymentStatus: string; total: number; email: string; createdAt: string }[];
  customers: number;
  activeProducts: number;
}

interface Kpi {
  revenue: number;
  orders: number;
}

export interface AdminOrderRow extends Order {
  id: number;
  userId: number;
  customer: { email: string; name: string };
}

export interface AdminOrderDetail extends Order {
  id: number;
  userId: number;
  customer: { id: number; email: string; firstName: string; lastName: string; phone: string | null; memberSince: string } | null;
  payments: {
    id: number;
    provider: 'mock' | 'paytr';
    merchantOid: string;
    amount: number;
    status: 'initiated' | 'succeeded' | 'failed';
    installmentCount: number | null;
    paymentType: string | null;
    failedReason: string | null;
    createdAt: string;
  }[];
  allowedTransitions: OrderStatus[];
}

export interface AdminProductRow {
  id: number;
  name: string;
  slug: string;
  skuBase: string;
  isActive: boolean;
  isFeatured: boolean;
  categoryName: string;
  imageUrl: string | null;
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  variantCount: number;
}

export interface AdminVariant {
  id?: number;
  sku: string;
  widthCm: number;
  lengthCm: number;
  sizeLabel?: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  isActive: boolean;
}

export interface AdminProduct {
  id?: number;
  categoryId: number;
  name: string;
  slug?: string;
  skuBase: string;
  description: string | null;
  material: string | null;
  pileHeight: string | null;
  origin: string | null;
  color: string | null;
  care: string | null;
  isActive: boolean;
  isFeatured: boolean;
  images: { url: string; alt?: string | null }[];
  variants: AdminVariant[];
  collectionIds: number[];
}

export type AdminRecord = Record<string, unknown> & { id: number };

export type AdminPage<T> = Paginated<T>;

/** Zod flatten() hatalarını alan → mesaj sözlüğüne çevirir. */
export function fieldErrors(details: unknown): Record<string, string> {
  const fe = (details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors ?? {};
  return Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]]));
}

export const ADMIN_STATUS_ACTIONS: Record<string, string> = {
  confirmed: 'Onayla',
  preparing: 'Hazırlanıyor',
  shipped: 'Kargoya Ver',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal Et',
};

/** GET /admin/products/:id yanıtı (DB satırları camelCase). */
export interface AdminProductResponse {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  skuBase: string;
  description: string | null;
  material: string | null;
  pileHeight: string | null;
  origin: string | null;
  color: string | null;
  care: string | null;
  isActive: boolean;
  isFeatured: boolean;
  images: { url: string; alt: string | null }[];
  variants: (Omit<AdminVariant, 'id'> & { id: number })[];
  collectionIds: number[];
}
