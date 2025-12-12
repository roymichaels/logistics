import { sxtExecute, sxtQuery } from '../client';
import type { InventoryRecord, InventoryLog, RestockRequest } from '../../data/types';

type InventoryFilter = { businessId?: string; productId?: string };

export async function getInventoryBalances(
  filter?: InventoryFilter
): Promise<InventoryRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.businessId) {
    clauses.push(`business_id = $${params.length + 1}`);
    params.push(filter.businessId);
  }

  if (filter?.productId) {
    clauses.push(`product_id = $${params.length + 1}`);
    params.push(filter.productId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return sxtQuery<InventoryRecord>(
    `
    SELECT *
    FROM inventory_records
    ${where}
    ORDER BY updated_at DESC, created_at DESC;
    `,
    params
  );
}

export async function getInventoryMovements(productId: string): Promise<InventoryLog[]> {
  return sxtQuery<InventoryLog>(
    'SELECT * FROM inventory_movements WHERE product_id = $1 ORDER BY created_at DESC;',
    [productId]
  );
}

export async function createInventoryMovement(input: {
  businessId: string;
  productId: string;
  quantity: number;
  reason: string;
  metadata?: string;
}): Promise<void> {
  const { businessId, productId, quantity, reason, metadata } = input;

  await sxtExecute(
    `
    INSERT INTO inventory_movements (
      id, business_id, product_id, quantity, reason, metadata, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, NOW()
    );
    `,
    [crypto.randomUUID(), businessId, productId, quantity, reason, metadata ?? null]
  );
}

export async function adjustInventory(productId: string, newQuantity: number): Promise<void> {
  await sxtExecute(
    `
    UPDATE inventory_records
    SET quantity = $1, updated_at = NOW()
    WHERE product_id = $2;
    `,
    [newQuantity, productId]
  );
}

export async function createRestockRequest(input: {
  businessId: string;
  productId: string;
  quantity: number;
  requestedBy: string;
}): Promise<RestockRequest> {
  const { businessId, productId, quantity, requestedBy } = input;
  const id = crypto.randomUUID();

  await sxtExecute(
    `
    INSERT INTO restock_requests (
      id, business_id, product_id, quantity, requested_by, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, 'pending', NOW(), NOW()
    );
    `,
    [id, businessId, productId, quantity, requestedBy]
  );

  const rows = await sxtQuery<RestockRequest>('SELECT * FROM restock_requests WHERE id = $1;', [id]);
  return rows[0];
}

export async function approveRestock(requestId: string): Promise<void> {
  await sxtExecute(
    `
    UPDATE restock_requests
    SET status = 'approved', updated_at = NOW()
    WHERE id = $1;
    `,
    [requestId]
  );
}

export async function fulfillRestock(requestId: string): Promise<void> {
  // Mark fulfilled
  await sxtExecute(
    `
    UPDATE restock_requests
    SET status = 'fulfilled', updated_at = NOW()
    WHERE id = $1;
    `,
    [requestId]
  );

  // Optional: log movement if desired; this assumes restock_requests has product_id/quantity
  try {
    const rows = await sxtQuery<RestockRequest>(
      'SELECT product_id, business_id, quantity FROM restock_requests WHERE id = $1;',
      [requestId]
    );
    const req = rows[0];
    if (req) {
      await createInventoryMovement({
        businessId: (req as any).business_id || (req as any).businessId,
        productId: (req as any).product_id || (req as any).productId,
        quantity: req.quantity || (req as any).quantity,
        reason: 'restock',
        metadata: `restock_request:${requestId}`
      });
    }
  } catch {
    // Silent fallback if restock_requests schema differs
  }
}
