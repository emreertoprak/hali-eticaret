import '@/openapi/registry';

import { z } from 'zod';

export const slugParams = z.object({ slug: z.string().min(1).max(220) });
export const idParams = z.object({ id: z.coerce.number().int().positive() });
export const okResponse = z.object({ ok: z.boolean() });
