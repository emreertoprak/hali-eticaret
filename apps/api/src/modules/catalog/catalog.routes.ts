import { Router } from 'express';
import { z } from 'zod';

import { validate } from '@/middlewares/validate';
import { slugParams } from '@/modules/common.schemas';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import {
  categorySchema,
  collectionSchema,
  homeSchema,
  productDetailSchema,
  type ProductListQuery,
  productListQuery,
  productListQueryBase,
  productPageSchema,
} from './catalog.schemas';
import { CatalogService } from './catalog.service';

export function catalogRouter(service = new CatalogService()): Router {
  const router = Router();
  const tags = ['Katalog'];

  doc('get', '/home', { tags, summary: 'Ana sayfa içeriği', response: homeSchema });
  router.get('/home', asyncHandler(async (_req, res) => res.json(await service.getHome())));

  doc('get', '/categories', { tags, summary: 'Kategoriler', response: z.array(categorySchema) });
  router.get('/categories', asyncHandler(async (_req, res) => res.json(await service.listCategories())));

  doc('get', '/categories/:slug', { tags, summary: 'Kategori detayı', params: slugParams, response: categorySchema });
  router.get(
    '/categories/:slug',
    validate({ params: slugParams }),
    asyncHandler(async (req, res) => res.json(await service.getCategory(req.params.slug))),
  );

  doc('get', '/collections', { tags, summary: 'Koleksiyonlar', response: z.array(collectionSchema) });
  router.get('/collections', asyncHandler(async (_req, res) => res.json(await service.listCollections())));

  doc('get', '/collections/:slug', { tags, summary: 'Koleksiyon detayı', params: slugParams, response: collectionSchema });
  router.get(
    '/collections/:slug',
    validate({ params: slugParams }),
    asyncHandler(async (req, res) => res.json(await service.getCollection(req.params.slug))),
  );

  doc('get', '/products', {
    tags,
    summary: 'Ürün listeleme, arama ve filtreleme',
    query: productListQueryBase,
    response: productPageSchema,
  });
  router.get(
    '/products',
    validate({ query: productListQuery }),
    asyncHandler(async (req, res) => res.json(await service.listProducts(req.query as unknown as ProductListQuery))),
  );

  doc('get', '/products/:slug', { tags, summary: 'Ürün detayı', params: slugParams, response: productDetailSchema });
  router.get(
    '/products/:slug',
    validate({ params: slugParams }),
    asyncHandler(async (req, res) => res.json(await service.getProduct(req.params.slug))),
  );

  return router;
}
