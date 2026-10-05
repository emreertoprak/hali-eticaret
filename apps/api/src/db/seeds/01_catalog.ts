import bcrypt from 'bcryptjs';
import type { Knex } from 'knex';

import catalog from './data/catalog.json';

const DESCRIPTION = (name: string, material: string, origin: string) =>
  `${name}, ${material.toLowerCase()} malzemesi ve ${origin} üretimi ile yaşam alanlarınıza sıcaklık katar. ` +
  'Yoğun dokusu sayesinde uzun yıllar formunu korur; kaymaz tabanı ve özenle bitirilmiş kenarları ile günlük kullanıma uygundur.';

export async function seed(knex: Knex): Promise<void> {
  // Bağımlılık sırasına göre temizle (FK).
  for (const table of [
    'payments', 'order_items', 'orders', 'cart_items', 'carts', 'addresses', 'product_collections', 'product_variants',
    'product_images', 'products', 'collections', 'categories', 'banners', 'announcements', 'users',
  ]) {
    await knex(table).delete();
  }

  const now = Date.now();
  const categoryIds = new Map<string, number>();
  for (const c of catalog.categories) {
    const [id] = await knex('categories').insert({
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: `/images/categories/${c.slug}.svg`,
      sort_order: c.sortOrder,
      show_in_stories: true,
    });
    categoryIds.set(c.slug, id);
  }

  const collectionIds = new Map<string, number>();
  for (const [i, c] of catalog.collections.entries()) {
    const [id] = await knex('collections').insert({
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.imageUrl,
      banner_url: c.bannerUrl,
      is_featured: c.featured,
      sort_order: i + 1,
    });
    collectionIds.set(c.slug, id);
  }

  for (const p of catalog.products) {
    const category = catalog.categories.find((c) => c.slug === p.category)!;
    const createdAt = new Date(now - p.createdDaysAgo * 86_400_000);
    const [productId] = await knex('products').insert({
      category_id: categoryIds.get(p.category),
      name: p.name,
      slug: p.slug,
      sku_base: p.skuBase,
      description: DESCRIPTION(p.name, category.material, category.origin),
      material: category.material,
      pile_height: category.pileHeight,
      origin: category.origin,
      color: p.color,
      care: catalog.care,
      is_featured: p.featured,
      created_at: createdAt,
      updated_at: createdAt,
    });
    await knex('product_images').insert(
      p.images.map((url, i) => ({ product_id: productId, url, alt: `${p.name} görsel ${i + 1}`, sort_order: i })),
    );
    await knex('product_variants').insert(
      p.variants.map((v) => ({
        product_id: productId,
        sku: v.sku,
        size_label: `${v.widthCm}x${v.lengthCm}`,
        width_cm: v.widthCm,
        length_cm: v.lengthCm,
        price: v.price,
        discount_price: v.discountPrice,
        stock: v.stock,
      })),
    );
    if (p.collections.length) {
      await knex('product_collections').insert(
        p.collections.map((slug) => ({ product_id: productId, collection_id: collectionIds.get(slug) })),
      );
    }
  }

  await knex('banners').insert([
    { title: 'HAND-WOVEN COLLECTION', subtitle: 'Usta ellerden, nesilden nesile', image_url: '/images/banners/hand-woven.svg', cta_text: 'Tümünü Gör', cta_url: '/koleksiyon/hand-woven', sort_order: 1 },
    { title: 'VINTAGE RUHU', subtitle: 'Eskitme dokularda sezon indirimi', image_url: '/images/banners/vintage-ruhu.svg', cta_text: 'Keşfet', cta_url: '/koleksiyon/vintage-ruhu', sort_order: 2 },
    { title: 'MODERN YAŞAM', subtitle: 'Minimal mekânlar için çağdaş tasarımlar', image_url: '/images/banners/modern-yasam.svg', cta_text: 'Tümünü Gör', cta_url: '/koleksiyon/modern-yasam', sort_order: 3 },
    { title: 'SERİ SONU FIRSATI', subtitle: 'Stoklarla sınırlı özel fiyatlar', image_url: '/images/banners/seri-sonu.svg', cta_text: 'Fırsatları Gör', cta_url: '/kategori/seri-sonu-firsati', sort_order: 4 },
  ]);

  await knex('announcements').insert([
    { placement: 'top', text: 'Halı tanıtımları YouTube kanalımızda — Göz At', url: 'https://www.youtube.com', sort_order: 1 },
    { placement: 'top', text: '1.500 TL üzeri siparişlerde kargo ücretsiz', url: '/urunler', sort_order: 2 },
    { placement: 'top', text: '14 gün içinde koşulsuz iade', url: null, sort_order: 3 },
    { placement: 'promo', text: 'Vade Farksız Taksit Fırsatı: 10.000 TL Üzerine 3, 15.000 TL Üzerine 5 Taksit!', url: null, sort_order: 1 },
  ]);

  await knex('users').insert([
    {
      email: 'admin@halievi.local',
      password_hash: await bcrypt.hash('Admin123!', 10),
      first_name: 'Site',
      last_name: 'Yöneticisi',
      role: 'admin',
    },
    {
      email: 'demo@halievi.local',
      password_hash: await bcrypt.hash('Demo1234!', 10),
      first_name: 'Demo',
      last_name: 'Müşteri',
      phone: '5551112233',
      role: 'customer',
    },
  ]);
}
