// catalog.json'daki ürün/kategori/koleksiyonlar için deterministik SVG halı görselleri üretir.
// Kullanım: node scripts/generate-rug-art.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(ROOT, '../../api/src/db/seeds/data/catalog.json'), 'utf8'));
const OUT = join(ROOT, '../public/images');

// ---- yardımcılar ----
function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seedStr) {
  let s = hash(seedStr) || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)), (s >>>= 0) / 4294967296);
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = (r, g, b) => `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, '#000000', t);

const ACCENTS = ['#c9952b', '#e9dfc9', '#1f2f55', '#7a1f2b', '#3f5b45', '#b5543a', '#2b2b2b', '#d8c3a5'];
function palette(base, rand) {
  const accent = ACCENTS[Math.floor(rand() * ACCENTS.length)];
  const accent2 = ACCENTS[Math.floor(rand() * ACCENTS.length)];
  return { base, deep: darken(base, 0.35), light: lighten(base, 0.45), accent, accent2, cream: '#efe6d2' };
}

// ---- desen aileleri: (w,h) alanına çizim yapar ----
function medallion(w, h, p, rand, vintage = false) {
  const cx = w / 2, cy = h / 2;
  const b = Math.min(w, h) * 0.07;
  let s = `<rect width="${w}" height="${h}" fill="${p.base}"/>`;
  // bordürler
  s += `<rect x="${b * 0.3}" y="${b * 0.3}" width="${w - b * 0.6}" height="${h - b * 0.6}" fill="none" stroke="${p.deep}" stroke-width="${b * 0.5}"/>`;
  s += `<rect x="${b}" y="${b}" width="${w - 2 * b}" height="${h - 2 * b}" fill="none" stroke="${p.accent}" stroke-width="${b * 0.35}" stroke-dasharray="${b * 0.6} ${b * 0.25}"/>`;
  s += `<rect x="${b * 1.6}" y="${b * 1.6}" width="${w - 3.2 * b}" height="${h - 3.2 * b}" fill="none" stroke="${p.cream}" stroke-width="${b * 0.12}"/>`;
  // alan motifleri
  const step = Math.min(w, h) / 7;
  for (let x = b * 2.4; x < w - b * 2; x += step) {
    for (let y = b * 2.4; y < h - b * 2; y += step) {
      const r = step * 0.18;
      s += `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${p.light}" opacity="0.35"/>`;
    }
  }
  // köşe parçaları
  const k = Math.min(w, h) * 0.22;
  for (const [x, y, sx, sy] of [[b * 1.6, b * 1.6, 1, 1], [w - b * 1.6, b * 1.6, -1, 1], [b * 1.6, h - b * 1.6, 1, -1], [w - b * 1.6, h - b * 1.6, -1, -1]]) {
    s += `<path d="M${x} ${y}L${x + sx * k} ${y}Q${x + sx * k * 0.5} ${y + sy * k * 0.5} ${x} ${y + sy * k}Z" fill="${p.deep}" opacity="0.85"/>`;
  }
  // göbek (madalyon)
  const rx = w * 0.26, ry = h * 0.2;
  s += `<path d="M${cx} ${cy - ry * 1.45}L${cx + rx} ${cy}L${cx} ${cy + ry * 1.45}L${cx - rx} ${cy}Z" fill="${p.deep}"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.7}" ry="${ry * 0.95}" fill="${p.accent}"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.5}" ry="${ry * 0.7}" fill="${p.cream}"/>`;
  s += `<path d="M${cx} ${cy - ry * 0.55}L${cx + rx * 0.3} ${cy}L${cx} ${cy + ry * 0.55}L${cx - rx * 0.3} ${cy}Z" fill="${p.base}"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    s += `<circle cx="${cx + Math.cos(a) * rx * 0.6}" cy="${cy + Math.sin(a) * ry * 0.82}" r="${Math.min(w, h) * 0.012}" fill="${p.deep}"/>`;
  }
  if (vintage) s += `<rect width="${w}" height="${h}" fill="${p.cream}" opacity="0.35" filter="url(#wear)"/>`;
  return s;
}

function kilim(w, h, p, rand) {
  let s = `<rect width="${w}" height="${h}" fill="${p.cream}"/>`;
  const bands = 6 + Math.floor(rand() * 4);
  const bh = h / bands;
  const cols = [p.base, p.deep, p.accent, p.accent2, p.light];
  for (let i = 0; i < bands; i++) {
    const y = i * bh;
    const c = cols[i % cols.length];
    if (i % 2 === 0) {
      s += `<rect x="0" y="${y}" width="${w}" height="${bh}" fill="${c}"/>`;
      const n = 4 + Math.floor(rand() * 3);
      const dw = w / n;
      for (let j = 0; j < n; j++) {
        const x = j * dw + dw / 2;
        const r = Math.min(dw, bh) * 0.38;
        s += `<path d="M${x} ${y + bh / 2 - r}L${x + r} ${y + bh / 2}L${x} ${y + bh / 2 + r}L${x - r} ${y + bh / 2}Z" fill="${p.cream}"/>`;
        s += `<path d="M${x} ${y + bh / 2 - r * 0.5}L${x + r * 0.5} ${y + bh / 2}L${x} ${y + bh / 2 + r * 0.5}L${x - r * 0.5} ${y + bh / 2}Z" fill="${cols[(i + 2) % cols.length]}"/>`;
      }
    } else {
      // zikzak şerit
      const zig = 10 + Math.floor(rand() * 6);
      let d = `M0 ${y + bh}`;
      for (let j = 0; j <= zig; j++) d += `L${(j / zig) * w} ${y + (j % 2 ? bh * 0.2 : bh * 0.8)}`;
      d += `L${w} ${y + bh}Z`;
      s += `<rect x="0" y="${y}" width="${w}" height="${bh}" fill="${p.cream}"/><path d="${d}" fill="${c}"/>`;
    }
  }
  return s;
}

function abstract(w, h, p, rand) {
  let s = `<rect width="${w}" height="${h}" fill="${p.light}"/>`;
  const cols = [p.base, p.deep, p.accent, p.accent2, p.cream];
  for (let i = 0; i < 7; i++) {
    const x = rand() * w, y = rand() * h, r = (0.15 + rand() * 0.35) * Math.min(w, h);
    const pts = Array.from({ length: 6 }, (_, k) => {
      const a = (k / 6) * Math.PI * 2;
      const rr = r * (0.6 + rand() * 0.6);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    });
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let k = 1; k <= pts.length; k++) {
      const a = pts[k % pts.length], prev = pts[k - 1];
      d += `Q${prev[0] + (rand() - 0.5) * r} ${prev[1] + (rand() - 0.5) * r} ${a[0]} ${a[1]}`;
    }
    s += `<path d="${d}Z" fill="${cols[i % cols.length]}" opacity="${0.55 + rand() * 0.4}"/>`;
  }
  for (let i = 0; i < 4; i++) {
    s += `<path d="M${rand() * w} 0C${rand() * w} ${h * 0.3} ${rand() * w} ${h * 0.7} ${rand() * w} ${h}" stroke="${p.deep}" stroke-width="${3 + rand() * 6}" fill="none" opacity="0.7"/>`;
  }
  return s;
}

function modern(w, h, p, rand) {
  let s = `<rect width="${w}" height="${h}" fill="${p.light}"/>`;
  const n = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) {
    const x = rand() * w * 0.8, y = rand() * h * 0.8;
    const ww = w * (0.15 + rand() * 0.4), hh = h * (0.1 + rand() * 0.3);
    s += `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${[p.base, p.deep, p.accent, p.cream][i % 4]}" opacity="0.8"/>`;
  }
  for (let i = 0; i < 12; i++) {
    const y = (i / 12) * h;
    s += `<line x1="0" y1="${y}" x2="${w}" y2="${y + h * 0.15}" stroke="${p.deep}" stroke-width="1.5" opacity="0.35"/>`;
  }
  return s;
}

function solid(w, h, p) {
  const m = Math.min(w, h) * 0.06;
  return `<rect width="${w}" height="${h}" fill="${p.base}"/><rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" fill="none" stroke="${p.deep}" stroke-width="${m * 0.5}" opacity="0.5"/><rect x="${m * 1.6}" y="${m * 1.6}" width="${w - 3.2 * m}" height="${h - 3.2 * m}" fill="none" stroke="${p.light}" stroke-width="2" opacity="0.5"/>`;
}

function shaggy(w, h, p, rand) {
  let s = `<rect width="${w}" height="${h}" fill="${p.base}"/>`;
  for (let i = 0; i < 260; i++) {
    const x = rand() * w, y = rand() * h, l = 6 + rand() * 12, a = rand() * Math.PI;
    s += `<line x1="${x}" y1="${y}" x2="${x + Math.cos(a) * l}" y2="${y + Math.sin(a) * l}" stroke="${rand() > 0.5 ? p.light : p.deep}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
  }
  return s;
}

function jute(w, h, p) {
  const tan = '#c8a97a', dark = '#9c7c4e';
  let s = `<rect width="${w}" height="${h}" fill="${tan}"/>`;
  const cx = w / 2, cy = h / 2;
  for (let i = 1; i < 14; i++) {
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${(w / 2) * (i / 14)}" ry="${(h / 2) * (i / 14)}" fill="none" stroke="${i % 3 ? dark : p.base}" stroke-width="${i % 3 ? 4 : 7}" stroke-dasharray="10 4" opacity="0.8"/>`;
  }
  return s;
}

function loop(w, h, p) {
  let s = `<rect width="${w}" height="${h}" fill="${p.base}"/>`;
  for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) s += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${p.light}" stroke-width="2" opacity="0.6"/>`;
  return s;
}

const STYLES = { medallion, kilim, abstract, modern, solid, shaggy, jute, loop, vintage: (w, h, p, r) => medallion(w, h, p, r, true) };

const DEFS = `<defs>
<filter id="pile" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feColorMatrix type="saturate" values="0" in="n" result="g"/><feComponentTransfer in="g" result="a"><feFuncA type="table" tableValues="0 0.22"/></feComponentTransfer><feComposite in="a" in2="SourceGraphic" operator="in"/></filter>
<filter id="wear"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="8"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.3"/><feComposite in="SourceGraphic" operator="in"/></filter>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#1f1f1f" flood-opacity="0.22"/></filter>
</defs>`;

function rugBody(style, w, h, p, rand) {
  const draw = STYLES[style] ?? medallion;
  // İç içe svg, desenin halı sınırları dışına taşmasını engeller.
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="hidden">${draw(w, h, p, rand)}<rect width="${w}" height="${h}" fill="#000" filter="url(#pile)"/></svg>`;
}

function fringe(x, y, w, color, dir) {
  let s = '';
  for (let i = 0; i <= 40; i++) s += `<line x1="${x + (i / 40) * w}" y1="${y}" x2="${x + (i / 40) * w}" y2="${y + dir * 16}" stroke="${color}" stroke-width="2"/>`;
  return s;
}

/** Ürün fotoğrafı: 3:4 tuval, açık zemin üzerinde gölgeli halı. */
function productShot(product, rugW, rugH, variant) {
  const W = 900, H = 1200;
  const rand = rng(product.slug);
  const p = palette(product.hex, rand);
  const bg = variant === 1 ? '#f3f1ec' : '#ebe7df';
  if (variant === 2) {
    // detay: halının yakın plan görünümü
    const body = rugBody(product.style, W * 0.9, H * 0.9, p, rng(product.slug));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${DEFS}<rect width="${W}" height="${H}" fill="${bg}"/><g transform="translate(${-W * 0.35} ${-H * 0.3}) scale(2.1)">${body}</g></svg>`;
  }
  const ratio = rugH / rugW;
  const maxW = W * 0.72, maxH = H * 0.78;
  let rw = maxW, rh = maxW * ratio;
  if (rh > maxH) { rh = maxH; rw = maxH / ratio; }
  const x = (W - rw) / 2, y = (H - rh) / 2;
  const fr = product.style === 'kilim' || product.style === 'medallion' || product.style === 'vintage';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${DEFS}<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<g filter="url(#shadow)"><g transform="translate(${x} ${y})">${rugBody(product.style, rw, rh, p, rand)}</g></g>` +
    (fr ? fringe(x, y, rw, p.cream, -1) + fringe(x, y + rh, rw, p.cream, 1) : '') +
    `</svg>`;
}

function square(seedKey, style, hex, size = 400) {
  const rand = rng(seedKey);
  const p = palette(hex, rand);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${DEFS}<g transform="translate(${-size * 0.25} ${-size * 0.25}) scale(1.5)">${rugBody(style, size, size, p, rand)}</g></svg>`;
}

/** Hero banner: koyu, zengin zemin üzerinde açılı halılar (metin frontend'de basılır). */
function banner(seedKey, styles, hexes, W = 1920, H = 760) {
  const rand = rng(seedKey);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${DEFS}`;
  s += `<rect width="${W}" height="${H}" fill="${darken(hexes[0], 0.55)}"/>`;
  const placements = [[-160, -120, -14], [560, 140, 8], [1260, -160, -6], [1500, 360, 12], [-60, 420, 6]];
  placements.forEach(([x, y, rot], i) => {
    const p = palette(hexes[i % hexes.length], rand);
    s += `<g transform="translate(${x} ${y}) rotate(${rot})" filter="url(#shadow)">${rugBody(styles[i % styles.length], 760, 540, p, rand)}</g>`;
  });
  s += `<rect width="${W}" height="${H}" fill="url(#fade)"/>`;
  s = s.replace('</defs>', `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.55" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient></defs>`);
  return `${s}</svg>`;
}

// ---- üretim ----
for (const dir of ['rugs', 'categories', 'collections', 'banners']) mkdirSync(join(OUT, dir), { recursive: true });

let count = 0;
for (const product of catalog.products) {
  const v = product.variants[Math.floor(product.variants.length / 2)];
  writeFileSync(join(OUT, 'rugs', `${product.slug}-1.svg`), productShot(product, v.widthCm, v.lengthCm, 1));
  writeFileSync(join(OUT, 'rugs', `${product.slug}-2.svg`), productShot(product, v.widthCm, v.lengthCm, 2));
  count += 2;
}
for (const category of catalog.categories) {
  const first = catalog.products.find((p) => p.category === category.slug);
  writeFileSync(join(OUT, 'categories', `${category.slug}.svg`), square(category.slug, category.style, first?.hex ?? '#7a1f2b'));
  count++;
}
const COLLECTION_STYLES = {
  'hand-woven': [['medallion', 'kilim', 'vintage'], ['#7a1f2b', '#6b3f73', '#c9952b', '#b5543a']],
  'vintage-ruhu': [['vintage', 'abstract', 'medallion'], ['#c46a86', '#3b6e8f', '#7a1f2b', '#cdb894']],
  'modern-yasam': [['modern', 'abstract', 'solid'], ['#3a3a3a', '#9a9a9a', '#cdb894', '#1f2f55']],
  'dogal-dokular': [['jute', 'loop', 'shaggy'], ['#9c7c4e', '#cdb894', '#3f5b45', '#e9dfc9']],
  'seri-sonu': [['modern', 'kilim', 'shaggy'], ['#b5543a', '#c9952b', '#1f2f55', '#3f5b45']],
};
for (const [slug, [styles, hexes]] of Object.entries(COLLECTION_STYLES)) {
  writeFileSync(join(OUT, 'banners', `${slug}.svg`), banner(slug, styles, hexes));
  writeFileSync(join(OUT, 'collections', `${slug}.svg`), banner(`${slug}-tile`, styles, hexes, 900, 1100));
  count += 2;
}
console.log(`${count} görsel üretildi → public/images`);
