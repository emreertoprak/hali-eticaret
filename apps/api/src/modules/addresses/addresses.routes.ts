import { Router } from 'express';
import { z } from 'zod';

import { requireAuth } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { idParams } from '@/modules/common.schemas';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import { addressBody, addressSchema } from './addresses.schemas';
import { AddressService } from './addresses.service';

export function addressesRouter(service = new AddressService()): Router {
  const router = Router();
  const tags = ['Adresler'];
  router.use('/addresses', requireAuth);

  doc('get', '/addresses', { tags, summary: 'Adreslerim', auth: true, response: z.array(addressSchema) });
  router.get('/addresses', asyncHandler(async (req, res) => res.json(await service.list(req.user!.id))));

  doc('post', '/addresses', { tags, summary: 'Adres ekle', auth: true, body: addressBody, response: addressSchema, status: 201 });
  router.post(
    '/addresses',
    validate({ body: addressBody }),
    asyncHandler(async (req, res) => res.status(201).json(await service.create(req.user!.id, req.body))),
  );

  doc('put', '/addresses/:id', { tags, summary: 'Adres güncelle', auth: true, params: idParams, body: addressBody, response: addressSchema });
  router.put(
    '/addresses/:id',
    validate({ params: idParams, body: addressBody }),
    asyncHandler(async (req, res) => res.json(await service.update(req.user!.id, Number(req.params.id), req.body))),
  );

  doc('delete', '/addresses/:id', { tags, summary: 'Adres sil', auth: true, params: idParams, status: 204 });
  router.delete(
    '/addresses/:id',
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      await service.remove(req.user!.id, Number(req.params.id));
      res.sendStatus(204);
    }),
  );

  return router;
}
