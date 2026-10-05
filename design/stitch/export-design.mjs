// Stitch projesinin tasarım sistemini (designMd + tema) output/ altına kaydeder.
// Kullanım: STITCH_API_KEY=... node export-design.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { StitchToolClient } from '@google/stitch-sdk';

const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'output');
const manifest = JSON.parse(await readFile(join(OUTPUT_DIR, 'manifest.json'), 'utf8'));

const client = new StitchToolClient({ apiKey: process.env.STITCH_API_KEY });
const { projects = [] } = await client.callTool('list_projects', {});
const project = projects.find((p) => p.name?.endsWith(`/${manifest.projectId}`));
await client.close();

if (!project?.designTheme) {
  console.error('Proje veya tasarım teması bulunamadı.');
  process.exit(1);
}

await mkdir(OUTPUT_DIR, { recursive: true });
const { designMd, ...theme } = project.designTheme;
await writeFile(join(OUTPUT_DIR, 'DESIGN.md'), designMd ?? '');
await writeFile(join(OUTPUT_DIR, 'theme.json'), `${JSON.stringify(theme, null, 2)}\n`);
console.log('DESIGN.md ve theme.json kaydedildi.');
