# Halı E-Ticaret

zevhali.com benzeri bir halı e-ticaret sitesi: **Express + Knex/MySQL + Redis** API ve **Next.js + Tailwind** vitrin.
Tasarım dili Google Stitch ile üretilen "Anatolian Loom Modern" tasarım sistemine dayanır
(`design/stitch/output/DESIGN.md`).

```
apps/api        Express 4 API (Zod, OpenAPI/Swagger, Knex migration/seed, JWT, Redis cache + rate limit)
apps/web        Next.js 15 App Router vitrini (Tailwind v4)
design/stitch   Stitch ekran üretim ve tasarım sistemi dışa aktarım scriptleri
```

## Hızlı başlangıç

Gereksinimler: Node 20+, MySQL 8, Redis 7 (veya Docker).

```bash
docker compose up -d                 # mysql:3306 (hali/hali), redis:6379
npm install
npm run db:migrate                   # Knex migration'ları
npm run db:seed                      # 20 kategori, 4 koleksiyon, 52 ürün, demo kullanıcılar
npm run dev:api                      # http://localhost:4000  (Swagger: /docs)
npm run dev:web                      # http://localhost:3000
```

Demo hesaplar: `demo@halievi.local / Demo1234!` (müşteri), `admin@halievi.local / Admin123!` (yönetici).

## API (`apps/api`)

| Komut | Açıklama |
|---|---|
| `npm run dev` | ts-node ile geliştirme sunucusu (`config/settings.dev.json`) |
| `npm test` | Jest + supertest (49 test, `hali_test` veritabanını sıfırdan migrate/seed eder) |
| `npm run lint` / `typecheck` | ESLint (simple-import-sort, eslint-plugin-n) / tsc |
| `npm run build` | typecheck + esbuild bundle → `dist/server.js` |
| `npm run build:prod` | bundle + javascript-obfuscator |
| `npm run migrate:latest` / `migrate:rollback` / `migrate:make <ad>` / `seed:run` | Knex CLI |

Yapılandırma `HALI_API_CONFIG_PATH` ile seçilen JSON dosyasından okunur ve Zod ile doğrulanır.
Gizli değerler ortam değişkenleriyle ezilebilir (`apps/api/.env.example`): `DB_*`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT`.
Prod ortamında JWT secret'larını mutlaka değiştirin.

Başlıca uçlar (`/api/v1`, tamamı `/docs` altında):

- `GET /home`, `/categories[/:slug]`, `/collections[/:slug]`
- `GET /products?category=&collection=&q=&size=160x230,200x290&minPrice=&maxPrice=&sort=price_asc&page=` (facet'lerle)
- `GET /products/:slug`
- `POST /auth/register|login|refresh`, `GET /auth/me`
- Sepet: `GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/:id` — misafir sepeti `X-Cart-Token` başlığıyla, girişte üye sepetine birleşir
- `GET|POST|PUT|DELETE /addresses`
- `POST /orders` (stok kilidi, fiyat snapshot'ı, taksit kuralı: 10.000 TL üzeri 3, 15.000 TL üzeri 5; ödeme şimdilik simüle), `GET /orders[/:orderNo]`
- Yönetim (`role=admin`): `/admin/products|categories|collections|banners|announcements` CRUD, `PATCH /admin/orders/:id/status` (iptalde stok iadesi)

## Web (`apps/web`)

`API_URL` (varsayılan `http://localhost:4000`) sunucu tarafı fetch'ler ve `/api/*` rewrite'ı için kullanılır; tarayıcı API'ye aynı origin üzerinden gider.

Sayfalar: ana sayfa (duyuru bandı, taksit bandı, story kategoriler, hero slider, yeni gelenler, koleksiyonlar),
`/urunler`, `/kategori/[slug]`, `/koleksiyon/[slug]`, `/arama`, `/urun/[slug]`, `/sepet`, `/odeme`, `/giris`,
`/hesabim`, `/hesabim/siparisler`, `/siparis/[orderNo]`.

Ürün/kategori/banner görselleri `scripts/generate-rug-art.mjs` ile seed kataloğundan deterministik SVG olarak üretilir
(`npm run images -w apps/web`). Gerçek ürün fotoğraflarına geçerken admin API'den görsel URL'lerini güncellemeniz yeterli.

## Stitch (`design/stitch`)

```bash
STITCH_API_KEY=... npm run stitch:generate            # prompts.mjs'deki ekranları Stitch projesinde üretir
STITCH_API_KEY=... npm run export-design -w design/stitch   # tasarım sistemini output/ altına yazar
```

Anahtar yalnızca ortam değişkeninden okunur; repoya yazmayın. Üretilen ekranların HTML/PNG'si
`contribution.usercontent.google.com` üzerinden indirilir — bu host erişilemezse ekranlar Stitch projesinde kalır,
indirme bağlantıları `output/manifest.json`'a yazılır.
