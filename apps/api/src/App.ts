import 'reflect-metadata';

import { resolve } from 'node:path';

import express, { type Express } from 'express';
import useragent from 'express-useragent';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { loadConfig } from '@/config/Config';
import { createAccessLogStream } from '@/infra/logger';
import { cors } from '@/middlewares/cors';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler';
import { generalLimiter } from '@/middlewares/rateLimiter';
import { addressesRouter } from '@/modules/addresses/addresses.routes';
import { adminRouter } from '@/modules/admin/admin.routes';
import { authRouter } from '@/modules/auth/auth.routes';
import { cartRouter } from '@/modules/cart/cart.routes';
import { catalogRouter } from '@/modules/catalog/catalog.routes';
import { healthRouter } from '@/modules/health/health.routes';
import { ordersRouter } from '@/modules/orders/orders.routes';
import { paymentsRouter } from '@/modules/payments/payments.routes';
import { buildOpenApiDocument } from '@/openapi/registry';

export function createApp(): Express {
  const config = loadConfig();
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors);
  app.use(express.json({ limit: '1mb' }));
  app.use(useragent.express());
  if (config.logging.accessLog) {
    app.use(morgan('combined', { stream: createAccessLogStream() }));
    app.use(morgan('dev'));
  }

  const api = express.Router();
  // Ödeme sağlayıcısı bildirimleri rate limit'e takılmamalı.
  api.use(paymentsRouter());
  api.use(generalLimiter());
  api.use(healthRouter());
  api.use(catalogRouter());
  api.use(authRouter());
  api.use(cartRouter());
  api.use(addressesRouter());
  api.use(ordersRouter());
  api.use('/admin', adminRouter());
  app.use('/api/v1', api);

  // Yönetim panelinden yüklenen görseller (dosya adları UUID; içerik değişmez).
  app.use(
    config.uploads.publicPath,
    express.static(resolve(config.uploads.dir), { index: false, dotfiles: 'deny', immutable: true, maxAge: '365d', fallthrough: true }),
  );

  // Route'lar kaydedildikten sonra doküman üretilir.
  const openApi = buildOpenApiDocument();
  app.get('/docs.json', (_req, res) => res.json(openApi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApi));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
