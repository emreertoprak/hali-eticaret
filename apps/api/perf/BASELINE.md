# API gecikme referans ölçümü

`npm run perf:ci -w apps/api` ile alınmıştır (bundle prod modunda `config/settings.perf.json` ile başlatılır).
Ortam: 4 vCPU tek makine — API, MySQL 8, Redis ve yük üreticisi aynı host üzerinde; bu yüzden değerler
gerçek dağıtımdan daha kötümser olabilir. Bütçeler: `perf/budgets.json`.

## Optimizasyon: ürün listesi önbelleği

İlk ölçümde `products-list` p95 **109 ms** (sunucu içi 107 ms) ve 268 istek/sn idi: her liste isteği 4 toplama
sorgusu (sayım, satırlar, ebat facet'i, fiyat aralığı) çalıştırıyor ve yük altında MySQL CPU'sunda kuyruklanıyordu
(tek başına her biri ~4-5 ms). Liste yanıtları 30 sn TTL ile sürümlü Redis anahtarlarına alındı; ürün/kategori/koleksiyon
yazımlarında sürüm `INCR` ile artırılır (KEYS taraması yok).

| Senaryo | Önce p95 | Sonra p95 | Önce RPS | Sonra RPS |
|---|---:|---:|---:|---:|
| products-list | 109.4 ms | 12.4 ms | 268 | 2298 |
| products-filtered | 68.2 ms | 10.8 ms | 482 | 2702 |
| products-search | 54.5 ms | 10.4 ms | 522 | 2694 |

`products-search-cold` her istekte farklı bir arama terimi kullanır, önbellek hiç vurmaz; veritabanı yolunun
gerçek maliyetini gösterir.

## Sonuç

| Senaryo | Bağlantı | İstek | RPS | p50 (ms) | p95 (ms) | p99 (ms) | max (ms) | Sunucu p95 | Bütçe p95 | Hata | Sonuç |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| health | 20 | 23823 | 2382 | 7.6 | **12.8** | 17.3 | 186.7 | 7.8 | 25 | 0 | PASS |
| home | 20 | 20373 | 2037 | 9.2 | **14.3** | 16.4 | 22.6 | 8.6 | 25 | 0 | PASS |
| categories | 20 | 30282 | 3028 | 6 | **10.1** | 12.6 | 30.3 | 5.5 | 25 | 0 | PASS |
| products-list | 20 | 22982 | 2298 | 8.3 | **12.4** | 14.6 | 20.5 | 7.7 | 60 | 0 | PASS |
| products-filtered | 20 | 27022 | 2702 | 6.9 | **10.8** | 13.2 | 20.8 | 7.2 | 60 | 0 | PASS |
| products-search | 20 | 26941 | 2694 | 7.1 | **10.4** | 12.4 | 19.2 | 6.8 | 80 | 0 | PASS |
| products-search-cold | 20 | 6587 | 659 | 29.4 | **43.8** | 52.9 | 75.9 | 42.1 | 120 | 0 | PASS |
| product-detail | 20 | 12664 | 1266 | 14.9 | **22.8** | 27.8 | 59.9 | 15.9 | 40 | 0 | PASS |
| cart-get | 20 | 16365 | 1637 | 11.6 | **17.4** | 20.6 | 32.5 | 12 | 40 | 0 | PASS |
| cart-update | 20 | 9904 | 990 | 19.6 | **29.4** | 34.3 | 52.2 | 24.4 | 60 | 0 | PASS |
| auth-me | 20 | 22699 | 2270 | 8.2 | **13.3** | 16.1 | 25.6 | 8.6 | 25 | 0 | PASS |
| orders-list | 20 | 12096 | 1210 | 15.9 | **23** | 27 | 35 | 17.1 | 50 | 0 | PASS |
| admin-stats | 5 | 4821 | 482 | 10.1 | **14.8** | 18.2 | 38.3 | 11.4 | 150 | 0 | PASS |
| auth-login | 4 | 115 | 12 | 361 | **400** | 464.3 | 471.4 | 387.7 | 600 | 0 | PASS |
