import { Router } from 'express';
import multer from 'multer';

import { loadConfig } from '@/config/Config';
import { LocalDiskStorage, sniffImage, type StorageDriver } from '@/infra/storage';
import { doc } from '@/openapi/registry';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';

const MAX_FILES = 10;

export function uploadsRouter(storage: StorageDriver = new LocalDiskStorage()): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: loadConfig().uploads.maxFileMb * 1024 * 1024, files: MAX_FILES },
  });

  doc('post', '/admin/uploads', { tags: ['Yönetim'], summary: 'Görsel yükle (multipart, alan: files; jpg/png/webp/avif)', auth: true, status: 201 });
  router.post(
    '/uploads',
    (req, res, next) =>
      upload.array('files', MAX_FILES)(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError) {
          const message =
            err.code === 'LIMIT_FILE_SIZE'
              ? `Dosya boyutu en fazla ${loadConfig().uploads.maxFileMb} MB olabilir.`
              : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
                ? `Tek seferde en fazla ${MAX_FILES} dosya yüklenebilir ("files" alanı).`
                : err.message;
          return next(AppError.badRequest(message));
        }
        next(err);
      }),
    asyncHandler(async (req, res) => {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (!files.length) throw AppError.badRequest('Yüklenecek dosya bulunamadı.');
      const detected = files.map((f) => ({ file: f, type: sniffImage(f.buffer) }));
      const invalid = detected.filter((d) => !d.type).map((d) => d.file.originalname);
      if (invalid.length) {
        throw AppError.badRequest('Yalnızca JPG, PNG, WEBP veya AVIF görseller yüklenebilir.', { files: invalid });
      }
      const saved = await Promise.all(detected.map((d) => storage.save(d.file.buffer, d.type!.ext, d.type!.contentType)));
      res.status(201).json({ files: saved });
    }),
  );
  return router;
}
