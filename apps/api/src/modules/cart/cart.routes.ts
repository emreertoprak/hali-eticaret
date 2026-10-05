import { type Request, type Response, Router } from 'express';

import { optionalAuth } from '@/middlewares/auth';
import { cartToken } from '@/middlewares/cartToken';
import { validate } from '@/middlewares/validate';
import { idParams } from '@/modules/common.schemas';
import { doc } from '@/openapi/registry';
import { asyncHandler } from '@/utils/asyncHandler';

import { addItemBody, type CartDto, cartSchema, updateItemBody } from './cart.schemas';
import { type CartOwner, CartService } from './cart.service';

const owner = (req: Request): CartOwner => ({ userId: req.user?.id, token: req.cartToken });

export function cartRouter(service = new CartService()): Router {
  const router = Router();
  const tags = ['Sepet'];
  router.use('/cart', cartToken, optionalAuth);

  const send = (res: Response, cart: CartDto, status = 200) =>
    res.status(status).setHeader('X-Cart-Token', cart.token).json(cart);

  doc('get', '/cart', { tags, summary: 'Sepeti getir (misafir: X-Cart-Token)', response: cartSchema });
  router.get('/cart', asyncHandler(async (req, res) => send(res, await service.get(owner(req)))));

  doc('post', '/cart/items', { tags, summary: 'Sepete ekle', body: addItemBody, response: cartSchema, status: 201 });
  router.post(
    '/cart/items',
    validate({ body: addItemBody }),
    asyncHandler(async (req, res) =>
      send(res, await service.addItem(owner(req), req.body.variantId, req.body.quantity), 201),
    ),
  );

  doc('patch', '/cart/items/:id', { tags, summary: 'Adet güncelle', params: idParams, body: updateItemBody, response: cartSchema });
  router.patch(
    '/cart/items/:id',
    validate({ params: idParams, body: updateItemBody }),
    asyncHandler(async (req, res) =>
      send(res, await service.updateItem(owner(req), Number(req.params.id), req.body.quantity)),
    ),
  );

  doc('delete', '/cart/items/:id', { tags, summary: 'Sepetten çıkar', params: idParams, response: cartSchema });
  router.delete(
    '/cart/items/:id',
    validate({ params: idParams }),
    asyncHandler(async (req, res) => send(res, await service.removeItem(owner(req), Number(req.params.id)))),
  );

  return router;
}
