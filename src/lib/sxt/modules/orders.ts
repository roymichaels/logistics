import { sxtExecute, sxtQuery } from '../client';
import type { Order } from '../../data/types';

type OrderFilter = { businessId?: string; status?: string };
type CreateOrderInput = {
  businessId: string;
  customerId: string;
  productId: string;
  quantity: number;
  status: string;
};
type OrderPatch = Partial<Order & { business_id?: string; customer_id?: string; product_id?: string }>;

function buildWhereClause(filter?: OrderFilter): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.businessId) {
    clauses.push(`business_id = $${params.length + 1}`);
    params.push(filter.businessId);
  }

  if (filter?.status) {
    clauses.push(`status = $${params.length + 1}`);
    params.push(filter.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

export async function listOrders(filter?: OrderFilter): Promise<Order[]> {
  const { where, params } = buildWhereClause(filter);
  return sxtQuery<Order>(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC;`,
    params
  );
}

export async function getOrder(id: string): Promise<Order | null> {
  const rows = await sxtQuery<Order>('SELECT * FROM orders WHERE id = $1 LIMIT 1;', [id]);
  return rows[0] ?? null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const {
    businessId,
    customerId,
    productId,
    quantity,
    status
  } = input;

  const orderId = crypto.randomUUID();

  await sxtExecute(
    `
    INSERT INTO orders (
      id, business_id, customer_id, product_id, quantity, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NOW(), NOW()
    );
    `,
    [orderId, businessId, customerId, productId, quantity, status]
  );

  const created = await getOrder(orderId);
  if (!created) {
    throw new Error('Failed to create order');
  }
  return created;
}

export async function updateOrder(id: string, patch: OrderPatch): Promise<Order> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const entries = Object.entries(patch ?? {}).filter(([, v]) => v !== undefined);
  entries.forEach(([key, value], idx) => {
    fields.push(`${key} = $${idx + 1}`);
    values.push(value);
  });

  if (fields.length === 0) {
    const existing = await getOrder(id);
    if (!existing) throw new Error('Order not found');
    return existing;
  }

  // updated_at
  fields.push(`updated_at = $${fields.length + 1}`);
  values.push(new Date().toISOString());

  // id in WHERE
  values.push(id);

  await sxtExecute(
    `UPDATE orders SET ${fields.join(', ')} WHERE id = $${fields.length + 1};`,
    values
  );

  const updated = await getOrder(id);
  if (!updated) {
    throw new Error('Failed to update order');
  }
  return updated;
}

export async function deleteOrder(id: string): Promise<void> {
  await sxtExecute('DELETE FROM orders WHERE id = $1;', [id]);
}

export async function listOrderHistory(orderId: string): Promise<unknown[]> {
  // If an order_events table exists, query it; otherwise return empty.
  try {
    return await sxtQuery<unknown>(
      'SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at DESC;',
      [orderId]
    );
  } catch {
    return [];
  }
}
