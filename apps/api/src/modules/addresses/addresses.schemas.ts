import '@/openapi/registry';

import { z } from 'zod';

export const addressBody = z
  .object({
    title: z.string().trim().min(1).max(60),
    fullName: z.string().trim().min(3).max(160),
    phone: z.string().trim().regex(/^\+?[0-9 ]{10,16}$/, 'Geçerli bir telefon numarası girin.'),
    city: z.string().trim().min(2).max(60),
    district: z.string().trim().min(2).max(60),
    addressLine: z.string().trim().min(10).max(500),
    postalCode: z.string().trim().max(10).optional(),
    isDefault: z.boolean().optional(),
  })
  .openapi('AddressInput');

export const addressSchema = addressBody
  .extend({ id: z.number(), postalCode: z.string().nullable(), isDefault: z.boolean() })
  .openapi('Address');

export type AddressInput = z.infer<typeof addressBody>;
export type AddressDto = z.infer<typeof addressSchema>;
