import type { Knex } from 'knex';

import { getDb } from '@/infra/db';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'customer' | 'admin';
}

export class UserRepository {
  constructor(private readonly db: () => Knex = getDb) {}

  findByEmail(email: string): Promise<UserRow | undefined> {
    return this.db()<UserRow>('users').where({ email }).first();
  }

  findById(id: number): Promise<UserRow | undefined> {
    return this.db()<UserRow>('users').where({ id }).first();
  }

  async create(data: Omit<UserRow, 'id'>): Promise<number> {
    const [id] = await this.db()('users').insert(data);
    return id;
  }
}
