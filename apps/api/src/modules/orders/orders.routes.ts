import { Router } from 'express';

import { requireAuth } from '@/middlewares/auth';
import { cartToken } from '@/middlewares/cartToken';
import { validate } from '@/middlewares/validate';
import { normalizeIp } from '@/modules/payments/payments.service';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import { createOrderBody, createOrderResponse, orderListQuery, orderNoParams, orderSchema, paymentStartSchema } from './orders.schemas';
import { OrderService } from './orders.service';

export function ordersRouter(service = new OrderService()): Router {
  const router = Router();
  const tags = ['Siparişler'];
  router.use('/orders', requireAuth);

  doc('post', '/orders', {
    tags,
    summary: 'Sepetten sipariş oluştur (kart: PayTR iframe URL döner)',
    auth: true,
    body: createOrderBody,
    response: createOrderResponse,
    status: 201,
  });
  router.post(
    '/orders',
    cartToken,
    validate({ body: createOrderBody }),
    asyncHandler(async (req, res) =>
      res.status(201).json(await service.create(req.user!.id, req.body, req.cartToken, normalizeIp(req.ip))),
    ),
  );

  doc('post', '/orders/:orderNo/payment', { tags, summary: 'Bekleyen kart siparişi için ödemeyi yeniden başlat', auth: true, params: orderNoParams, response: paymentStartSchema });
  router.post(
    '/orders/:orderNo/payment',
    validate({ params: orderNoParams }),
    asyncHandler(async (req, res) => res.json(await service.retryPayment(req.user!.id, req.params.orderNo, normalizeIp(req.ip)))),
  );

  doc('get', '/orders', { tags, summary: 'Siparişlerim', auth: true, query: orderListQuery });
  router.get(
    '/orders',
    validate({ query: orderListQuery }),
    asyncHandler(async (req, res) => {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      res.json(await service.list(req.user!.id, page, limit));
    }),
  );

  doc('get', '/orders/:orderNo', { tags, summary: 'Sipariş detayı', auth: true, params: orderNoParams, response: orderSchema });
  router.get(
    '/orders/:orderNo',
    validate({ params: orderNoParams }),
    asyncHandler(async (req, res) => res.json(await service.get(req.user!.id, req.params.orderNo))),
  );

  return router;
}
