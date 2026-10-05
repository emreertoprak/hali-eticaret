import { api, teardown } from '../helpers';

afterAll(teardown);

describe('Katalog', () => {
  it('GET /health', async () => {
    const res = await api().get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('GET /home ana sayfa bloklarını döner', async () => {
    const res = await api().get('/api/v1/home').expect(200);
    expect(res.body.storyCategories).toHaveLength(20);
    expect(res.body.banners.length).toBeGreaterThan(0);
    expect(res.body.announcements.some((a: { placement: string }) => a.placement === 'promo')).toBe(true);
    expect(res.body.newArrivals).toHaveLength(8);
    expect(res.body.commerce.installments).toHaveLength(2);
  });

  it('GET /categories ürün sayılarıyla döner', async () => {
    const res = await api().get('/api/v1/categories').expect(200);
    const shaggy = res.body.find((c: { slug: string }) => c.slug === 'shaggy-hali');
    expect(shaggy).toMatchObject({ name: 'Shaggy Halı' });
    expect(shaggy.productCount).toBeGreaterThan(0);
  });

  it('GET /categories/:slug bilinmeyen kategoride 404', async () => {
    const res = await api().get('/api/v1/categories/yok-boyle-bir-sey').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /products kategori + ebat + fiyat filtresi ve sıralama', async () => {
    const res = await api()
      .get('/api/v1/products')
      .query({ category: 'shaggy-hali', size: '160x230', sort: 'price_asc', maxPrice: 100000 })
      .expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    const prices = res.body.items.map((i: { price: number }) => i.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    for (const item of res.body.items) {
      expect(item.category.slug).toBe('shaggy-hali');
      expect(item.sizes).toContain('160x230');
    }
    expect(res.body.facets.sizes.length).toBeGreaterThan(0);
  });

  it('GET /products arama ve sayfalama', async () => {
    const res = await api().get('/api/v1/products').query({ q: 'vintage', limit: 2, page: 1 }).expect(200);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.totalPages).toBe(Math.ceil(res.body.total / 2));
  });

  it('GET /products geçersiz sorguyu reddeder', async () => {
    const res = await api().get('/api/v1/products').query({ minPrice: 500, maxPrice: 100 }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    await api().get('/api/v1/products').query({ sort: 'rastgele' }).expect(400);
  });

  it('GET /products/:slug varyantlarla ürün detayı', async () => {
    const list = await api().get('/api/v1/products').query({ limit: 1 }).expect(200);
    const slug = list.body.items[0].slug;
    const res = await api().get(`/api/v1/products/${slug}`).expect(200);
    expect(res.body.slug).toBe(slug);
    expect(res.body.variants.length).toBeGreaterThan(0);
    expect(res.body.images.length).toBeGreaterThan(0);
    expect(res.body.price).toBe(Math.min(...res.body.variants.map((v: { price: number }) => v.price)));
  });

  it('bilinmeyen route 404 döner', async () => {
    await api().get('/api/v1/olmayan').expect(404);
  });
});
