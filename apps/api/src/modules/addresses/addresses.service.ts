import type { Knex } from 'knex';

import { getDb } from '@/infra/db';
import { AppError } from '@/utils/AppError';

import type { AddressDto, AddressInput } from './addresses.schemas';

export const toAddress = (r: any): AddressDto => ({
  id: r.id,
  title: r.title,
  fullName: r.full_name,
  phone: r.phone,
  city: r.city,
  district: r.district,
  addressLine: r.address_line,
  postalCode: r.postal_code,
  isDefault: Boolean(r.is_default),
});

const toRow = (a: AddressInput) => ({
  title: a.title,
  full_name: a.fullName,
  phone: a.phone,
  city: a.city,
  district: a.district,
  address_line: a.addressLine,
  postal_code: a.postalCode ?? null,
});

export class AddressService {
  constructor(private readonly db: () => Knex = getDb) {}

  async list(userId: number): Promise<AddressDto[]> {
    const rows = await this.db()('addresses').where({ user_id: userId }).orderBy([{ column: 'is_default', order: 'desc' }, { column: 'id' }]);
    return rows.map(toAddress);
  }

  async get(userId: number, id: number): Promise<AddressDto> {
    const row = await this.db()('addresses').where({ user_id: userId, id }).first();
    if (!row) throw AppError.notFound('Adres bulunamadı.');
    return toAddress(row);
  }

  async create(userId: number, input: AddressInput): Promise<AddressDto> {
    const id = await this.db().transaction(async (trx) => {
      const count = await trx('addresses').where({ user_id: userId }).count({ n: '*' }).first();
      const isDefault = input.isDefault || Number(count?.n ?? 0) === 0;
      if (isDefault) await trx('addresses').where({ user_id: userId }).update({ is_default: false });
      const [newId] = await trx('addresses').insert({ ...toRow(input), user_id: userId, is_default: isDefault });
      return newId;
    });
    return this.get(userId, id);
  }

  async update(userId: number, id: number, input: AddressInput): Promise<AddressDto> {
    await this.get(userId, id);
    await this.db().transaction(async (trx) => {
      if (input.isDefault) await trx('addresses').where({ user_id: userId }).update({ is_default: false });
      await trx('addresses')
        .where({ user_id: userId, id })
        .update({ ...toRow(input), ...(input.isDefault ? { is_default: true } : {}), updated_at: trx.fn.now() });
    });
    return this.get(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const deleted = await this.db()('addresses').where({ user_id: userId, id }).delete();
    if (!deleted) throw AppError.notFound('Adres bulunamadı.');
  }
}
