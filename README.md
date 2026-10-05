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
Yönetim paneli: http://localhost:3000/yonetim (yönetici hesabıyla).

## API (`apps/api`)

| Komut | Açıklama |
|---|---|
| `npm run dev` | ts-node ile geliştirme sunucusu (`config/settings.dev.json`) |
| `npm test` | Jest + supertest (67 test, `hali_test` veritabanını sıfırdan migrate/seed eder; PayTR çağrıları taklit edilir) |
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
- `POST /orders` (stok kilidi, fiyat snapshot'ı; kartla ödemede PayTR iframe URL'i döner), `POST /orders/:orderNo/payment` (yeniden deneme), `GET /orders[/:orderNo]`
- `POST /payments/paytr/callback` — PayTR bildirim URL'i
- Yönetim (`role=admin`): `/admin/stats`, `/admin/uploads`, `/admin/products|categories|collections|banners|announcements` CRUD,
  `GET /admin/orders[/:id]`, `PATCH /admin/orders/:id/status` (kargo takip no, iptalde stok iadesi)

## Ödeme — PayTR iFrame API

Kart bilgileri sitemize hiç gelmez; müşteri PayTR'nin güvenli ödeme formunu (iframe) kullanır.

1. **Akış:** `POST /orders` (kart) → sipariş `pending_payment` olarak açılır, stok rezerve edilir, sepet korunur →
   API PayTR'den token alır (`paytr_token` HMAC-SHA256) → vitrin `/odeme/guvenli/[orderNo]` sayfasında iframe'i gösterir →
   PayTR, **Bildirim URL**'ine imzalı POST atar → API hash ve tutarı doğrular, siparişi `confirmed/paid` yapar, satın alınan
   ürünleri sepetten düşer ve `OK` döner (bildirim tekrar gelirse etkisizdir). Başarısız ödemede sipariş beklemede kalır,
   müşteri sipariş sayfasından tekrar deneyebilir. `pendingOrderTtlMinutes` (30 dk) içinde ödenmeyen siparişler dakikalık
   işle iptal edilir ve stok iade edilir.
2. **Ortam değişkenleri** (`apps/api/.env.example`):
   ```bash
   PAYMENT_PROVIDER=paytr            # varsayılan: mock (anında başarılı, geliştirme/test için)
   PAYTR_MERCHANT_ID=...
   PAYTR_MERCHANT_KEY=...
   PAYTR_MERCHANT_SALT=...
   PAYTR_TEST_MODE=1                 # canlıda 0
   PUBLIC_WEB_URL=https://www.siteniz.com   # ödeme sonrası dönüş adresleri
   ```
   Mağaza bilgilerini repoya veya config JSON'una yazmayın.
3. **PayTR mağaza panelindeki Bildirim URL ayarı:** `https://api.siteniz.com/api/v1/payments/paytr/callback`
   (API'nin herkese açık adresi). Yerelde denemek için API'yi bir tünelle açın (`ngrok http 4000` veya
   `cloudflared tunnel --url http://localhost:4000`) ve tünel adresini Bildirim URL olarak girin.
4. **Taksit:** sepet tutarına göre `max_installment` gönderilir (10.000 TL üzeri 3, 15.000 TL üzeri 5; altında tek çekim).
   "Vade farksız" olması için taksit oranlarının PayTR panelinde mağaza tarafından karşılanacak şekilde ayarlanması gerekir.
5. **Test:** `PAYTR_TEST_MODE=1` ile PayTR'nin dokümantasyonundaki test kartlarını kullanın. Bildirimin geldiğini
   yönetim panelinde sipariş detayındaki **Ödeme denemeleri** bölümünden görebilirsiniz.

## Yönetim paneli (`/yonetim`)

Yalnızca `role=admin` kullanıcılar erişir (diğerleri giriş sayfasına yönlendirilir / 403 görür).

- **Panel:** bugün / 7 gün / dönem cirosu, ortalama sepet, ödeme bekleyenler, günlük ciro grafiği (tablo görünümü ile),
  sipariş durum dağılımı, en çok satanlar, düşük stok, son siparişler.
- **Siparişler:** durum filtresi, sipariş no / e-posta araması, detayda müşteri, adres, PayTR ödeme denemeleri ve yalnızca
  izinli durum geçişleri (kargoya verirken kargo firması + takip numarası zorunlu; müşteri sipariş sayfasında görür).
- **Ürünler:** liste/arama, oluştur/düzenle — görsel yükleme (sürükle-bırak, sıralama; ilk görsel kapak), kategori,
  koleksiyonlar, ebat varyantları (en/boy, SKU, fiyat, indirimli fiyat, stok, aktif), pasife alma.
- **İçerik:** kategoriler (story halkaları), koleksiyonlar, hero banner'ları, duyuru bantları.

Yüklenen görseller API'de `uploads/` klasörüne (config `uploads.dir`) kaydedilir ve `/uploads/...` altında sunulur;
yalnızca JPG/PNG/WEBP/AVIF kabul edilir (içerik baytlarına bakılarak, SVG reddedilir), en fazla 5 MB.
Çok sunuculu kurulumda `src/infra/storage.ts` içindeki `StorageDriver` arayüzüne bir S3/R2 sürücüsü eklenmelidir.

## Web (`apps/web`)

`API_URL` (varsayılan `http://localhost:4000`) sunucu tarafı fetch'ler ve `/api/*` rewrite'ı için kullanılır; tarayıcı API'ye aynı origin üzerinden gider.

Vitrin sayfaları `src/app/(store)/` altında (ana sayfa, `/urunler`, `/kategori/[slug]`, `/koleksiyon/[slug]`, `/arama`,
`/urun/[slug]`, `/sepet`, `/odeme`, `/odeme/guvenli/[orderNo]`, `/giris`, `/hesabim`, `/hesabim/siparisler`,
`/siparis/[orderNo]`); yönetim paneli `src/app/yonetim/` altında kendi kabuğuyla.

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
