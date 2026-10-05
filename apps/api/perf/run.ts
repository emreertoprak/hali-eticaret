/* eslint-disable no-console */
/**
 * API gecikme (p50/p95/p99) testi.
 *
 *   npm run perf                      # çalışan API'ye karşı (PERF_BASE_URL, varsayılan http://localhost:4000)
 *   npm run perf -- --start           # bundle'ı perf config'iyle başlatır, ölçer, kapatır
 *   npm run perf -- --duration 20 --connections 50 --only products-list,product-detail
 *
 * Kapalı döngü yük modeli: N sanal kullanıcı (bağlantı) her yanıttan hemen sonra yeni istek atar.
 * Her senaryo önce ısınır (ölçülmez), sonra süre boyunca ölçülür. Bütçe aşımı → çıkış kodu 1.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

interface Args {
  base: string;
  duration: number;
  warmup: number;
  connections: number;
  only?: string[];
  start: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  };
  return {
    base: get('base') ?? process.env.PERF_BASE_URL ?? 'http://localhost:4000',
    duration: Number(get('duration') ?? 10),
    warmup: Number(get('warmup') ?? 2),
    connections: Number(get('connections') ?? 20),
    only: get('only')?.split(','),
    start: argv.includes('--start'),
  };
}

const args = parseArgs();
const agent = new http.Agent({ keepAlive: true, maxSockets: Math.max(args.connections, 50) });

interface Res {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
}

function request(method: string, path: string, headers: Record<string, string> = {}, body?: unknown): Promise<Res> {
  const url = new URL(path, args.base);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        agent,
        headers: { accept: 'application/json', ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}), ...headers },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString(), headers: res.headers }));
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function json<T>(method: string, path: string, headers?: Record<string, string>, body?: unknown): Promise<T> {
  const res = await request(method, path, headers, body);
  if (res.status >= 400) throw new Error(`${method} ${path} → ${res.status} ${res.body.slice(0, 200)}`);
  return JSON.parse(res.body) as T;
}

interface Scenario {
  name: string;
  description: string;
  connections?: number;
  /** Her çağrıda bir istek tanımı döner (rastgele ürün, filtre vb.). */
  next: (worker: number) => { method: string; path: string; headers?: Record<string, string>; body?: unknown };
}

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

async function buildScenarios(): Promise<Scenario[]> {
  const products = await json<{ items: { slug: string }[] }>('GET', '/api/v1/products?limit=60');
  const categories = await json<{ slug: string }[]>('GET', '/api/v1/categories');
  const slugs = products.items.map((p) => p.slug);
  const sizes = ['80x150', '120x180', '160x230', '200x290'];
  const sorts = ['recommended', 'price_asc', 'price_desc', 'newest'];
  const terms = ['halı', 'kilim', 'vintage', 'shaggy', 'bordo', 'yün'];

  const demo = await json<{ accessToken: string }>('POST', '/api/v1/auth/login', {}, { email: 'demo@halievi.local', password: 'Demo1234!' });
  const admin = await json<{ accessToken: string }>('POST', '/api/v1/auth/login', {}, { email: 'admin@halievi.local', password: 'Admin123!' });
  const demoAuth = { authorization: `Bearer ${demo.accessToken}` };
  const adminAuth = { authorization: `Bearer ${admin.accessToken}` };

  // Her sanal kullanıcıya iki kalemli bir misafir sepeti (yazma senaryosu veriyi büyütmesin diye adet değiştirilir).
  const variantIds: number[] = [];
  for (const slug of slugs.slice(0, 10)) {
    const d = await json<{ variants: { id: number; stock: number }[] }>('GET', `/api/v1/products/${slug}`);
    variantIds.push(...d.variants.filter((v) => v.stock >= 2).map((v) => v.id));
  }
  const carts: { token: string; itemId: number }[] = [];
  for (let i = 0; i < Math.max(args.connections, 20); i++) {
    const c1 = await json<{ token: string; items: { id: number }[] }>('POST', '/api/v1/cart/items', {}, { variantId: pick(variantIds), quantity: 1 });
    const c2 = await json<{ token: string; items: { id: number }[] }>('POST', '/api/v1/cart/items', { 'x-cart-token': c1.token }, { variantId: pick(variantIds), quantity: 1 });
    carts.push({ token: c2.token, itemId: c2.items[0].id });
  }
  const flip: number[] = [];

  return [
    { name: 'health', description: 'GET /health (DB + Redis ping)', next: () => ({ method: 'GET', path: '/api/v1/health' }) },
    { name: 'home', description: 'GET /home (Redis cache)', next: () => ({ method: 'GET', path: '/api/v1/home' }) },
    { name: 'categories', description: 'GET /categories (Redis cache)', next: () => ({ method: 'GET', path: '/api/v1/categories' }) },
    {
      name: 'products-list',
      description: 'GET /products sayfalı liste + facet',
      next: () => ({ method: 'GET', path: `/api/v1/products?page=${1 + Math.floor(Math.random() * 3)}&limit=24&sort=${pick(sorts)}` }),
    },
    {
      name: 'products-filtered',
      description: 'GET /products kategori + ebat + fiyat filtresi',
      next: () => ({ method: 'GET', path: `/api/v1/products?category=${pick(categories).slug}&size=${pick(sizes)}&maxPrice=20000&sort=price_asc` }),
    },
    { name: 'products-search', description: 'GET /products?q= metin araması', next: () => ({ method: 'GET', path: `/api/v1/products?q=${encodeURIComponent(pick(terms))}` }) },
    {
      name: 'products-search-cold',
      description: 'GET /products?q=<her seferinde farklı> (önbellek hiç vurmaz: veritabanı yolu)',
      next: () => ({ method: 'GET', path: `/api/v1/products?q=${pick(terms)}${Math.random().toString(36).slice(2, 6)}` }),
    },
    { name: 'product-detail', description: 'GET /products/:slug', next: () => ({ method: 'GET', path: `/api/v1/products/${pick(slugs)}` }) },
    { name: 'cart-get', description: 'GET /cart (misafir, 2 kalem)', next: (w) => ({ method: 'GET', path: '/api/v1/cart', headers: { 'x-cart-token': carts[w % carts.length].token } }) },
    {
      name: 'cart-update',
      description: 'PATCH /cart/items/:id (stok kontrolü + yazma)',
      next: (w) => {
        const c = carts[w % carts.length];
        flip[w] = flip[w] === 1 ? 2 : 1;
        return { method: 'PATCH', path: `/api/v1/cart/items/${c.itemId}`, headers: { 'x-cart-token': c.token }, body: { quantity: flip[w] } };
      },
    },
    { name: 'auth-me', description: 'GET /auth/me (JWT doğrulama + DB)', next: () => ({ method: 'GET', path: '/api/v1/auth/me', headers: demoAuth }) },
    { name: 'orders-list', description: 'GET /orders (kullanıcı siparişleri)', next: () => ({ method: 'GET', path: '/api/v1/orders', headers: demoAuth }) },
    { name: 'admin-stats', description: 'GET /admin/stats (toplama sorguları)', connections: 5, next: () => ({ method: 'GET', path: '/api/v1/admin/stats?days=30', headers: adminAuth }) },
    {
      name: 'auth-login',
      description: 'POST /auth/login (bcrypt, CPU bağımlı)',
      connections: 4,
      next: () => ({ method: 'POST', path: '/api/v1/auth/login', body: { email: 'demo@halievi.local', password: 'Demo1234!' } }),
    },
  ];
}

const percentile = (sorted: number[], q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] : 0);

interface Result {
  name: string;
  description: string;
  connections: number;
  requests: number;
  rps: number;
  errors: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  serverP95: number;
  budget?: number;
  pass: boolean;
}

async function runScenario(s: Scenario, budget: { p95?: number; maxErrorRate: number }): Promise<Result> {
  const connections = Math.min(s.connections ?? args.connections, args.connections);
  const latencies: number[] = [];
  const server: number[] = [];
  let errors = 0;
  let measuring = false;
  const end = performance.now() + (args.warmup + args.duration) * 1000;
  setTimeout(() => (measuring = true), args.warmup * 1000);

  const worker = async (w: number) => {
    while (performance.now() < end) {
      const r = s.next(w);
      const t0 = performance.now();
      try {
        const res = await request(r.method, r.path, r.headers, r.body);
        const dt = performance.now() - t0;
        if (!measuring) continue;
        latencies.push(dt);
        const st = /dur=([\d.]+)/.exec(String(res.headers['server-timing'] ?? ''));
        if (st) server.push(Number(st[1]));
        if (res.status >= 400) errors++;
      } catch {
        if (measuring) errors++;
      }
    }
  };
  await Promise.all(Array.from({ length: connections }, (_, i) => worker(i)));

  latencies.sort((a, b) => a - b);
  server.sort((a, b) => a - b);
  const p95 = percentile(latencies, 0.95);
  const errorRate = latencies.length ? errors / latencies.length : 1;
  const r2 = (n: number) => Math.round(n * 10) / 10;
  return {
    name: s.name,
    description: s.description,
    connections,
    requests: latencies.length,
    rps: Math.round(latencies.length / args.duration),
    errors,
    p50: r2(percentile(latencies, 0.5)),
    p95: r2(p95),
    p99: r2(percentile(latencies, 0.99)),
    max: r2(latencies[latencies.length - 1] ?? 0),
    serverP95: r2(percentile(server, 0.95)),
    budget: budget.p95,
    pass: (budget.p95 === undefined || p95 <= budget.p95) && errorRate <= budget.maxErrorRate,
  };
}

async function waitForHealth(timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      if ((await request('GET', '/api/v1/health')).status === 200) return;
    } catch {
      /* henüz açılmadı */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('API ayağa kalkmadı');
}

function report(results: Result[]) {
  const header = '| Senaryo | Bağlantı | İstek | RPS | p50 (ms) | p95 (ms) | p99 (ms) | max (ms) | Sunucu p95 | Bütçe p95 | Hata | Sonuç |';
  const sep = '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|';
  const rows = results.map(
    (r) =>
      `| ${r.name} | ${r.connections} | ${r.requests} | ${r.rps} | ${r.p50} | **${r.p95}** | ${r.p99} | ${r.max} | ${r.serverP95} | ${r.budget ?? '-'} | ${r.errors} | ${r.pass ? 'PASS' : 'FAIL'} |`,
  );
  return [header, sep, ...rows].join('\n');
}

async function main() {
  const root = join(__dirname, '..');
  const budgets = JSON.parse(readFileSync(join(__dirname, 'budgets.json'), 'utf8'));
  let child: ChildProcess | undefined;
  if (args.start) {
    child = spawn(process.execPath, ['dist/server.js'], {
      cwd: root,
      env: { ...process.env, HALI_API_CONFIG_PATH: './config/settings.perf.json', NODE_ENV: 'production' },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
  }
  try {
    await waitForHealth();
    const scenarios = (await buildScenarios()).filter((s) => !args.only || args.only.includes(s.name));
    const results: Result[] = [];
    for (const s of scenarios) {
      const r = await runScenario(s, { ...budgets.defaults, ...budgets.scenarios[s.name] });
      results.push(r);
      console.log(`${r.pass ? '✓' : '✗'} ${r.name.padEnd(18)} p50=${r.p50}ms p95=${r.p95}ms p99=${r.p99}ms rps=${r.rps} hata=${r.errors}`);
    }
    const md = [
      `# API gecikme raporu`,
      ``,
      `- Tarih: ${new Date().toISOString()}`,
      `- Hedef: ${args.base} · süre ${args.duration}s/senaryo (+${args.warmup}s ısınma) · en fazla ${args.connections} eşzamanlı bağlantı`,
      `- Node ${process.version} · ${process.platform}/${process.arch}`,
      `- "Sunucu p95": Server-Timing başlığından uygulama içi süre (ağ/istemci hariç)`,
      ``,
      report(results),
      ``,
    ].join('\n');
    const outDir = join(__dirname, 'reports');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'latest.md'), md);
    writeFileSync(join(outDir, 'latest.json'), JSON.stringify(results, null, 2));
    console.log(`\n${report(results)}\n\nRapor: perf/reports/latest.md`);
    process.exitCode = results.every((r) => r.pass) ? 0 : 1;
  } finally {
    child?.kill('SIGTERM');
    agent.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
