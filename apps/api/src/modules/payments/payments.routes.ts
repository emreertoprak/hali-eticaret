import express, { Router } from 'express';

import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import { PaymentService } from './payments.service';

/** PayTR "Bildirim URL" uç noktası. Mağaza panelinde bu adres tanımlanmalıdır. */
export function paymentsRouter(service = new PaymentService()): Router {
  const router = Router();
  doc('post', '/payments/paytr/callback', { tags: ['Ödeme'], summary: 'PayTR ödeme bildirimi (form-urlencoded, yanıt: OK)' });
  router.post(
    '/payments/paytr/callback',
    express.urlencoded({ extended: false, limit: '64kb' }),
    asyncHandler(async (req, res) => {
      await service.handlePaytrCallback(req.body);
      res.type('text/plain').send('OK');
    }),
  );
  return router;
}
