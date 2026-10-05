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
| `npm test` | Jest + supertest (89 test, `hali_test` veritabanını sıfırdan migrate/seed eder; PayTR ve Google çağrıları taklit edilir) |
| `npm run perf` / `perf:ci` | p50/p95/p99 gecikme testi (çalışan API'ye karşı / bundle'ı kendisi başlatarak), bütçe aşımında çıkış kodu 1 |
| `npm run lint` / `typecheck` | ESLint (simple-import-sort, eslint-plugin-n) / tsc |
| `npm run build` | typecheck + esbuild bundle → `dist/server.js` |
| `npm run build:prod` | bundle + javascript-obfuscator |
| `npm run migrate:latest` / `migrate:rollback` / `migrate:make <ad>` / `seed:run` | Knex CLI |

Yapılandırma `HALI_API_CONFIG_PATH` ile seçilen JSON dosyasından okunur ve Zod ile doğrulanır.
Gizli değerler ortam değişkenleriyle ezilebilir (`apps/api/.env.example`): `DB_*`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`GOOGLE_CLIENT_ID`, `COOKIE_SECURE`, `PAYTR_*`, `PORT`. `env: production` iken varsayılan (`dev-`) JWT secret'ları veya
`COOKIE_SECURE=0` ile API açılmaz.

Başlıca uçlar (`/api/v1`, tamamı `/docs` altında):

- `GET /home`, `/categories[/:slug]`, `/collections[/:slug]`
- `GET /products?category=&collection=&q=&size=160x230,200x290&minPrice=&maxPrice=&sort=price_asc&page=` (facet'lerle)
- `GET /products/:slug`
- `POST /auth/register|login|google|refresh|logout|logout-all`, `GET /auth/me`, `GET /auth/providers`
- `POST /auth/password` (değiştir/belirle), `POST /auth/password/forgot`, `POST /auth/password/reset`
- Sepet: `GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/:id` — misafir sepeti `X-Cart-Token` başlığıyla, girişte üye sepetine birleşir
- `GET|POST|PUT|DELETE /addresses`
- `POST /orders` (stok kilidi, fiyat snapshot'ı; kartla ödemede PayTR iframe URL'i döner), `POST /orders/:orderNo/payment` (yeniden deneme), `GET /orders[/:orderNo]`
- `POST /payments/paytr/callback` — PayTR bildirim URL'i
- Yönetim (`role=admin`): `/admin/stats`, `/admin/uploads`, `/admin/products|categories|collections|banners|announcements` CRUD,
  `GET /admin/orders[/:id]`, `PATCH /admin/orders/:id/status` (kargo takip no, iptalde stok iadesi)

## Kimlik doğrulama ve güvenlik

- **Oturum modeli:** kısa ömürlü access token (15 dk, JWT HS256, `iss`/`aud` doğrulamalı) yalnızca tarayıcı belleğinde
  tutulur. Refresh token (7 gün) **httpOnly + SameSite=Strict** çerezde (`he_rt`, yol `/api/v1/auth`) taşınır; JS
  okuyamaz. Refresh token'lar tek kullanımlıktır (rotasyon, Redis'te kayıtlı); kullanılmış bir token tekrar gelirse
  çalınmış kabul edilir ve kullanıcının tüm oturumları kapatılır. `he_session=1` gizli olmayan bir işaret çerezidir
  (yalnızca "oturum var" bilgisi).
- **Brute-force:** IP bazlı rate limit + e-posta bazlı kilit (5 hatalı deneme → 15 dk). Kullanıcı yoksa da bcrypt
  karşılaştırması yapılır; yanıt ve süre hesabın varlığını ele vermez.
- **Parola:** 8-72 karakter, harf + rakam; bcrypt (prod 12+ önerilir: `security.bcryptRounds`).
- **Şifre sıfırlama:** her zaman aynı yanıt (hesap keşfi yok), e-posta başına dakikada 1 istek, token yalnızca SHA-256
  özetiyle saklanır, 30 dk geçerli ve tek kullanımlık; sıfırlama ve şifre değişikliği tüm oturumları kapatır.
  E-postalar şimdilik `LogMailer` ile loga yazılır; canlıda `src/infra/mailer.ts` arayüzüne SMTP/SES sürücüsü eklenmeli.
- **Google ile giriş:** Google Identity Services butonu → `POST /auth/google` (ID token `google-auth-library` ile imza,
  `aud = GOOGLE_CLIENT_ID`, süre ve `email_verified` kontrolü). Aynı e-postalı mevcut hesap Google kimliğine bağlanır;
  sitede e-postası doğrulanmamış bir hesaba bağlanırken eski şifre ve oturumlar sıfırlanır (e-postayı önceden kaydeden
  birinin hesabı paylaşmasını önler). Kurulum: Google Cloud Console → APIs & Services → Credentials → OAuth client ID
  (Web application), *Authorized JavaScript origins*'e site adresini (ör. `http://localhost:3000`) ekleyin,
  `GOOGLE_CLIENT_ID`'yi API ortamına verin. Client ID tanımlı değilse buton gösterilmez.
- **Başlıklar:** API'de helmet (HSTS, nosniff, frame vb.), `x-powered-by` kapalı, prod'da `/docs` kapalı
  (`security.exposeDocs`). Web'de `frame-ancestors 'self' https://www.paytr.com`, `Referrer-Policy`,
  `Permissions-Policy`, `COOP: same-origin-allow-popups` (Google popup'ı), prod'da HSTS; `/yonetim` için `noindex` ve `no-store`.

## Performans (p95)

`apps/api/perf/run.ts` kapalı döngü yük üretir (varsayılan 20 eşzamanlı bağlantı, 2 sn ısınma + 10 sn ölçüm/senaryo),
p50/p95/p99, RPS, hata sayısı ve `Server-Timing` başlığından sunucu içi p95'i raporlar; `perf/budgets.json`'daki
bütçeleri aşan senaryo olursa çıkış kodu 1 döner (CI'da kullanılabilir). Son ölçüm ve yapılan optimizasyon:
[`apps/api/perf/BASELINE.md`](apps/api/perf/BASELINE.md).

```bash
npm run perf:ci -w apps/api                       # bundle'ı prod config'iyle başlatır, ölçer, kapatır
npm run perf -w apps/api -- --only products-list --duration 20 --connections 50
```

Her API yanıtı `Server-Timing: app;dur=<ms>` başlığı taşır; `security.slowRequestMs` eşiğini aşan istekler loglanır.

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

Giriş sayfasında e-posta/şifre ve Google ile giriş, `/sifremi-unuttum` ve `/sifre-sifirla` sayfaları; Hesabım'da şifre
değiştirme/belirleme ve tüm cihazlardan çıkış.

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
