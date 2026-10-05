import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import { loadConfig } from '@/config/Config';

export interface StoredFile {
  url: string;
  size: number;
  contentType: string;
}

/** Yüklenen dosyaların saklandığı yer. Yerel disk; ileride S3/R2 sürücüsü ile değiştirilebilir. */
export interface StorageDriver {
  save(buffer: Buffer, ext: string, contentType: string): Promise<StoredFile>;
  remove(url: string): Promise<void>;
}

export class LocalDiskStorage implements StorageDriver {
  constructor(
    private readonly dir = resolve(loadConfig().uploads.dir),
    private readonly publicPath = loadConfig().uploads.publicPath,
  ) {}

  async save(buffer: Buffer, ext: string, contentType: string): Promise<StoredFile> {
    await mkdir(this.dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await writeFile(join(this.dir, name), buffer, { flag: 'wx' });
    return { url: `${this.publicPath}/${name}`, size: buffer.length, contentType };
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(`${this.publicPath}/`)) return;
    // basename: yol gezinmesini (../) engeller.
    await unlink(join(this.dir, basename(url))).catch(() => undefined);
  }
}

/** Dosya içeriğinin ilk baytlarına bakarak desteklenen görsel türünü belirler (uzantıya/mime'a güvenmez). */
export function sniffImage(buf: Buffer): { ext: string; contentType: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', contentType: 'image/png' };
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', contentType: 'image/webp' };
  const brand = buf.toString('ascii', 4, 12);
  if (brand === 'ftypavif' || brand === 'ftypavis') return { ext: 'avif', contentType: 'image/avif' };
  return null;
}
