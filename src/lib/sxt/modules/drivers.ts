import { sxtExecute, sxtQuery } from '../client';
import type { DriverStatusRecord } from '../../data/types';

type DriverStatusPatch = Partial<DriverStatusRecord>;
type DriverStatusFilter = { zoneId?: string };

export async function getDriverStatus(driverId: string): Promise<DriverStatusRecord | null> {
  const rows = await sxtQuery<DriverStatusRecord>(
    'SELECT * FROM driver_status WHERE driver_id = $1 ORDER BY updated_at DESC LIMIT 1;',
    [driverId]
  );
  return rows[0] ?? null;
}

export async function listDriverStatuses(filter?: DriverStatusFilter): Promise<DriverStatusRecord[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.zoneId) {
    clauses.push(`current_zone_id = $${params.length + 1}`);
    params.push(filter.zoneId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return sxtQuery<DriverStatusRecord>(
    `SELECT * FROM driver_status ${where} ORDER BY updated_at DESC;`,
    params
  );
}

export async function updateDriverStatus(
  driverId: string,
  patch: DriverStatusPatch
): Promise<DriverStatusRecord> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const entries = Object.entries(patch ?? {}).filter(([, v]) => v !== undefined);
  entries.forEach(([key, value], idx) => {
    fields.push(`${key} = $${idx + 1}`);
    values.push(value);
  });

  // Always set updated_at
  fields.push(`updated_at = $${fields.length + 1}`);
  values.push(new Date().toISOString());

  // WHERE driver_id
  values.push(driverId);

  await sxtExecute(
    `UPDATE driver_status SET ${fields.join(', ')} WHERE driver_id = $${fields.length + 1};`,
    values
  );

  const updated = await getDriverStatus(driverId);
  if (!updated) {
    throw new Error('Failed to update driver status');
  }
  return updated;
}

export async function logDriverMovement(input: {
  driverId: string;
  lat: number;
  lng: number;
  timestamp?: string;
}): Promise<void> {
  const { driverId, lat, lng, timestamp } = input;
  await sxtExecute(
    `
    INSERT INTO driver_movements (
      id, driver_id, lat, lng, recorded_at
    ) VALUES (
      $1, $2, $3, $4, $5
    );
    `,
    [crypto.randomUUID(), driverId, lat, lng, timestamp || new Date().toISOString()]
  );
}

export async function assignDriverToOrder(input: {
  driverId: string;
  orderId: string;
  assignedBy: string;
}): Promise<void> {
  const { driverId, orderId, assignedBy } = input;
  await sxtExecute(
    `
    INSERT INTO order_assignments (id, order_id, driver_id, assigned_by, created_at)
    VALUES ($1, $2, $3, $4, NOW());
    `,
    [crypto.randomUUID(), orderId, driverId, assignedBy]
  );

  await sxtExecute(
    `
    UPDATE orders SET assigned_driver = $1, updated_at = NOW() WHERE id = $2;
    `,
    [driverId, orderId]
  );
}

export async function getDriverOrders(driverId: string): Promise<unknown[]> {
  return sxtQuery(
    'SELECT * FROM orders WHERE assigned_driver = $1 ORDER BY created_at DESC;',
    [driverId]
  );
}

export async function getDriverZone(driverId: string): Promise<unknown | null> {
  const rows = await sxtQuery(
    'SELECT * FROM driver_zones WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 1;',
    [driverId]
  );
  return rows[0] ?? null;
}

export async function setDriverZone(driverId: string, zoneId: string): Promise<void> {
  await sxtExecute(
    `
    INSERT INTO driver_zones (id, driver_id, zone_id, created_at)
    VALUES ($1, $2, $3, NOW());
    `,
    [crypto.randomUUID(), driverId, zoneId]
  );

  await sxtExecute(
    `
    UPDATE driver_status SET current_zone_id = $1, updated_at = NOW() WHERE driver_id = $2;
    `,
    [zoneId, driverId]
  );
}
