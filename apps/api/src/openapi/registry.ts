import { extendZodWithOpenApi, OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

export const errorSchema = registry.register(
  'Error',
  z.object({
    error: z.object({ code: z.string(), message: z.string(), details: z.any().optional() }),
  }),
);

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface DocOptions {
  tags: string[];
  summary: string;
  auth?: boolean;
  params?: z.AnyZodObject;
  query?: z.AnyZodObject;
  body?: z.ZodTypeAny;
  response?: z.ZodTypeAny;
  status?: number;
}

/** Route tanımlarının yanında kısa OpenAPI kaydı. */
export function doc(method: Method, path: string, o: DocOptions): void {
  registry.registerPath({
    method,
    path: `/api/v1${path.replace(/:(\w+)/g, '{$1}')}`,
    tags: o.tags,
    summary: o.summary,
    security: o.auth ? [{ [bearerAuth.name]: [] }] : undefined,
    request: {
      params: o.params,
      query: o.query,
      body: o.body ? { content: { 'application/json': { schema: o.body } } } : undefined,
    },
    responses: {
      [o.status ?? 200]: {
        description: 'Başarılı',
        content: o.response ? { 'application/json': { schema: o.response } } : undefined,
      },
      400: { description: 'Geçersiz istek', content: { 'application/json': { schema: errorSchema } } },
    },
  });
}

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: { title: 'Halı E-Ticaret API', version: '1.0.0' },
    servers: [{ url: '/' }],
  });
}
