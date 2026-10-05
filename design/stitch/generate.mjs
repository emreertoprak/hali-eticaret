// Kullanım: STITCH_API_KEY=... npm run stitch:generate [-- home product]
// Anahtar sadece ortam değişkeninden okunur; dosyaya yazılmaz.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stitch } from '@google/stitch-sdk';

import { DESIGN_SYSTEM, SCREENS } from './prompts.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(ROOT, 'output');
const MANIFEST = join(OUTPUT_DIR, 'manifest.json');

if (!process.env.STITCH_API_KEY && !process.env.STITCH_ACCESS_TOKEN) {
  console.error('STITCH_API_KEY ortam değişkeni tanımlı değil.');
  process.exit(1);
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    return { projectId: null, screens: {} };
  }
}

async function download(url, target) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} indirilemedi: ${res.status}`);
  await writeFile(target, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? SCREENS.filter((s) => only.includes(s.key)) : SCREENS;
  await mkdir(OUTPUT_DIR, { recursive: true });

  const manifest = await loadManifest();
  const project = manifest.projectId
    ? stitch.project(manifest.projectId)
    : await stitch.createProject('Halı Evi - E-Ticaret Vitrini');
  manifest.projectId = project.projectId;

  for (const screenDef of targets) {
    const started = Date.now();
    console.log(`[${screenDef.key}] üretiliyor...`);
    try {
      const screen = await project.generate(`${DESIGN_SYSTEM}\n${screenDef.prompt}`, screenDef.deviceType);
      const dir = join(OUTPUT_DIR, screenDef.key);
      await mkdir(dir, { recursive: true });
      const htmlUrl = await screen.getHtml();
      const imageUrl = await screen.getImage();
      manifest.screens[screenDef.key] = { screenId: screen.screenId, deviceType: screenDef.deviceType, htmlUrl, imageUrl };
      await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
      // İndirme host'u (usercontent.google.com) ağ politikası tarafından engellenebilir;
      // bu durumda ekran Stitch projesinde kalır, URL'ler manifest'te saklanır.
      for (const [url, file] of [[htmlUrl, 'index.html'], [imageUrl, 'screenshot.png']]) {
        await download(url, join(dir, file)).catch((err) => console.warn(`[${screenDef.key}] ${file} indirilemedi: ${err.message}`));
      }
      console.log(`[${screenDef.key}] tamam (${Math.round((Date.now() - started) / 1000)} sn)`);
    } catch (err) {
      console.error(`[${screenDef.key}] hata:`, err?.code ?? '', err?.message ?? err);
    }
  }
}

await main();
