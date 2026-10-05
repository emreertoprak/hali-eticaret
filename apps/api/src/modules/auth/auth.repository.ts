import type { Knex } from 'knex';

import { getDb } from '@/infra/db';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: 'customer' | 'admin';
  google_sub: string | null;
  avatar_url: string | null;
  email_verified_at: Date | null;
}

export class UserRepository {
  constructor(private readonly db: () => Knex = getDb) {}

  findByEmail(email: string): Promise<UserRow | undefined> {
    return this.db()<UserRow>('users').where({ email }).first();
  }

  findById(id: number): Promise<UserRow | undefined> {
    return this.db()<UserRow>('users').where({ id }).first();
  }

  findByGoogleSub(sub: string): Promise<UserRow | undefined> {
    return this.db()<UserRow>('users').where({ google_sub: sub }).first();
  }

  async create(data: Partial<Omit<UserRow, 'id'>> & Pick<UserRow, 'email' | 'first_name' | 'last_name' | 'role'>): Promise<number> {
    const [id] = await this.db()('users').insert(data);
    return id;
  }

  update(id: number, patch: Partial<Omit<UserRow, 'id'>> & { password_changed_at?: Date }) {
    return this.db()('users').where({ id }).update({ ...patch, updated_at: this.db().fn.now() });
  }
}
