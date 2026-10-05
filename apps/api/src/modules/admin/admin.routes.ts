import { type Request, type Response, Router } from 'express';
import type { ZodTypeAny } from 'zod';

import { requireAuth, requireRole } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { idParams } from '@/modules/common.schemas';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import {
  adminListQuery,
  announcementInput,
  bannerInput,
  categoryInput,
  collectionInput,
  orderStatusBody,
  productInput,
} from './admin.schemas';
import { AdminOrderService, AdminProductService, SimpleCrud } from './admin.service';

const tags = ['Yönetim'];
const id = (req: Request) => Number(req.params.id);

function mountCrud(router: Router, path: string, crud: SimpleCrud, body: ZodTypeAny, label: string) {
  doc('get', `/admin/${path}`, { tags, summary: `${label} listesi`, auth: true });
  router.get(`/${path}`, asyncHandler(async (_req, res) => res.json(await crud.list())));

  doc('post', `/admin/${path}`, { tags, summary: `${label} oluştur`, auth: true, body, status: 201 });
  router.post(`/${path}`, validate({ body }), asyncHandler(async (req, res) => res.status(201).json(await crud.create(req.body))));

  doc('put', `/admin/${path}/:id`, { tags, summary: `${label} güncelle`, auth: true, params: idParams, body });
  router.put(
    `/${path}/:id`,
    validate({ params: idParams, body }),
    asyncHandler(async (req, res) => res.json(await crud.update(id(req), req.body))),
  );

  doc('delete', `/admin/${path}/:id`, { tags, summary: `${label} sil`, auth: true, params: idParams, status: 204 });
  router.delete(
    `/${path}/:id`,
    validate({ params: idParams }),
    asyncHandler(async (req: Request, res: Response) => {
      await crud.remove(id(req));
      res.sendStatus(204);
    }),
  );
}

export function adminRouter(
  products = new AdminProductService(),
  orders = new AdminOrderService(),
): Router {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  mountCrud(router, 'categories', new SimpleCrud('categories', 'Kategori', true), categoryInput, 'Kategori');
  mountCrud(router, 'collections', new SimpleCrud('collections', 'Koleksiyon', true), collectionInput, 'Koleksiyon');
  mountCrud(router, 'banners', new SimpleCrud('banners', 'Banner', false), bannerInput, 'Banner');
  mountCrud(router, 'announcements', new SimpleCrud('announcements', 'Duyuru', false), announcementInput, 'Duyuru');

  doc('get', '/admin/products', { tags, summary: 'Ürün listesi', auth: true, query: adminListQuery });
  router.get(
    '/products',
    validate({ query: adminListQuery }),
    asyncHandler(async (req, res) => {
      const q = req.query as unknown as { page: number; limit: number; q?: string };
      res.json(await products.list(q.page, q.limit, q.q));
    }),
  );
  doc('get', '/admin/products/:id', { tags, summary: 'Ürün detayı', auth: true, params: idParams });
  router.get('/products/:id', validate({ params: idParams }), asyncHandler(async (req, res) => res.json(await products.get(id(req)))));

  doc('post', '/admin/products', { tags, summary: 'Ürün oluştur (görsel + ebat varyantları)', auth: true, body: productInput, status: 201 });
  router.post('/products', validate({ body: productInput }), asyncHandler(async (req, res) => res.status(201).json(await products.create(req.body))));

  doc('put', '/admin/products/:id', { tags, summary: 'Ürün güncelle', auth: true, params: idParams, body: productInput });
  router.put(
    '/products/:id',
    validate({ params: idParams, body: productInput }),
    asyncHandler(async (req, res) => res.json(await products.update(id(req), req.body))),
  );

  doc('delete', '/admin/products/:id', { tags, summary: 'Ürünü pasife al', auth: true, params: idParams, status: 204 });
  router.delete(
    '/products/:id',
    validate({ params: idParams }),
    asyncHandler(async (req, res) => {
      await products.deactivate(id(req));
      res.sendStatus(204);
    }),
  );

  doc('get', '/admin/orders', { tags, summary: 'Siparişler', auth: true, query: adminListQuery });
  router.get(
    '/orders',
    validate({ query: adminListQuery }),
    asyncHandler(async (req, res) => {
      const q = req.query as unknown as { page: number; limit: number; status?: string };
      res.json(await orders.list(q.page, q.limit, q.status));
    }),
  );

  doc('patch', '/admin/orders/:id/status', { tags, summary: 'Sipariş durumunu güncelle', auth: true, params: idParams, body: orderStatusBody });
  router.patch(
    '/orders/:id/status',
    validate({ params: idParams, body: orderStatusBody }),
    asyncHandler(async (req, res) => res.json(await orders.updateStatus(id(req), req.body.status))),
  );

  return router;
}
