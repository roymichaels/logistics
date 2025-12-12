import { sxtExecute, sxtQuery } from '../client';
import type { Business, BusinessUser } from '../../data/types';

type BusinessFilter = { ownerId?: string };

export async function listBusinesses(filter?: BusinessFilter): Promise<Business[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.ownerId) {
    clauses.push(`owner_id = $${params.length + 1}`);
    params.push(filter.ownerId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return sxtQuery<Business>(
    `SELECT * FROM businesses ${where} ORDER BY created_at DESC;`,
    params
  );
}

export async function getBusiness(id: string): Promise<Business | null> {
  const rows = await sxtQuery<Business>('SELECT * FROM businesses WHERE id = $1 LIMIT 1;', [id]);
  return rows[0] ?? null;
}

export async function createBusiness(input: {
  name: string;
  ownerId: string;
  metadata?: string;
}): Promise<Business> {
  const { name, ownerId, metadata } = input;
  const id = crypto.randomUUID();

  await sxtExecute(
    `
    INSERT INTO businesses (id, name, owner_id, metadata, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW());
    `,
    [id, name, ownerId, metadata ?? null]
  );

  // Also add owner as business user
  await sxtExecute(
    `
    INSERT INTO business_users (id, business_id, user_id, role, created_at)
    VALUES ($1, $2, $3, 'owner', NOW());
    `,
    [crypto.randomUUID(), id, ownerId]
  );

  const created = await getBusiness(id);
  if (!created) throw new Error('Failed to create business');
  return created;
}

export async function listBusinessUsers(businessId: string): Promise<BusinessUser[]> {
  return sxtQuery<BusinessUser>(
    `
    SELECT * FROM business_users
    WHERE business_id = $1
    ORDER BY created_at DESC;
    `,
    [businessId]
  );
}

export async function addBusinessUser(input: {
  businessId: string;
  userId: string;
  role: string;
}): Promise<void> {
  const { businessId, userId, role } = input;
  await sxtExecute(
    `
    INSERT INTO business_users (id, business_id, user_id, role, created_at)
    VALUES ($1, $2, $3, $4, NOW());
    `,
    [crypto.randomUUID(), businessId, userId, role]
  );
}

export async function setUserRole(input: {
  businessId: string;
  userId: string;
  role: string;
}): Promise<void> {
  const { businessId, userId, role } = input;
  await sxtExecute(
    `
    UPDATE business_users
    SET role = $1
    WHERE business_id = $2 AND user_id = $3;
    `,
    [role, businessId, userId]
  );
}

export async function getUserRole(input: {
  businessId: string;
  userId: string;
}): Promise<string | null> {
  const { businessId, userId } = input;
  const rows = await sxtQuery<{ role: string }>(
    `
    SELECT role FROM business_users
    WHERE business_id = $1 AND user_id = $2
    LIMIT 1;
    `,
    [businessId, userId]
  );
  return rows[0]?.role ?? null;
}
