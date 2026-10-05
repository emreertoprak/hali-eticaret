import type { ApiErrorBody, Category, Collection, Home, ProductDetail, ProductPage } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Sunucu tarafında doğrudan backend'e, tarayıcıda Next rewrite (/api) üzerinden gider. */
const baseUrl = () => (typeof window === 'undefined' ? (process.env.API_URL ?? 'http://localhost:4000') : '');

export async function apiFetch<T>(path: string, init: RequestInit & { revalidate?: number } = {}): Promise<T> {
  const { revalidate, headers, ...rest } = init;
  // FormData gönderilirken Content-Type'ı tarayıcı (multipart boundary ile) belirler.
  const isForm = typeof FormData !== 'undefined' && rest.body instanceof FormData;
  const res = await fetch(`${baseUrl()}/api/v1${path}`, {
    ...rest,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(revalidate !== undefined ? { next: { revalidate } } : {}),
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'HTTP_ERROR', err?.message ?? 'İstek başarısız oldu.', err?.details);
  }
  return body as T;
}

// ---- Katalog (server component'lerde ISR ile kullanılır) ----
const CATALOG_REVALIDATE = 60;

export const getHome = () => apiFetch<Home>('/home', { revalidate: CATALOG_REVALIDATE });
export const getCategories = () => apiFetch<Category[]>('/categories', { revalidate: CATALOG_REVALIDATE });
export const getCategory = (slug: string) => apiFetch<Category>(`/categories/${encodeURIComponent(slug)}`, { revalidate: CATALOG_REVALIDATE });
export const getCollections = () => apiFetch<Collection[]>('/collections', { revalidate: CATALOG_REVALIDATE });
export const getCollection = (slug: string) => apiFetch<Collection>(`/collections/${encodeURIComponent(slug)}`, { revalidate: CATALOG_REVALIDATE });
export const getProduct = (slug: string) => apiFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { revalidate: 30 });

export type ProductQuery = Partial<Record<'category' | 'collection' | 'q' | 'minPrice' | 'maxPrice' | 'size' | 'sort' | 'page' | 'limit' | 'featured', string>>;

export function getProducts(query: ProductQuery) {
  const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '') as [string, string][]);
  return apiFetch<ProductPage>(`/products?${params}`, { revalidate: 30 });
}

/** Sayfa bulunamazsa null döner (notFound() için). */
export async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
