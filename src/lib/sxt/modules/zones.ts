import { sxtExecute, sxtQuery } from '../client';
import type { Zone } from '../../data/types';

type ZoneFilter = { businessId?: string };
type ZonePatch = Partial<Zone & { business_id?: string }>;

export async function listZones(filter?: ZoneFilter): Promise<Zone[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter?.businessId) {
    clauses.push(`business_id = $${params.length + 1}`);
    params.push(filter.businessId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  return sxtQuery<Zone>(
    `SELECT * FROM zones ${where} ORDER BY created_at DESC;`,
    params
  );
}

export async function getZone(id: string): Promise<Zone | null> {
  const rows = await sxtQuery<Zone>('SELECT * FROM zones WHERE id = $1 LIMIT 1;', [id]);
  return rows[0] ?? null;
}

export async function createZone(input: {
  businessId: string;
  name: string;
  polygon?: string;
}): Promise<Zone> {
  const { businessId, name, polygon } = input;
  const id = crypto.randomUUID();

  await sxtExecute(
    `
    INSERT INTO zones (id, business_id, name, polygon, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW());
    `,
    [id, businessId, name, polygon ?? null]
  );

  const created = await getZone(id);
  if (!created) throw new Error('Failed to create zone');
  return created;
}

export async function updateZone(id: string, patch: ZonePatch): Promise<Zone> {
  const fields: string[] = [];
  const values: unknown[] = [];

  const entries = Object.entries(patch ?? {}).filter(([, v]) => v !== undefined);
  entries.forEach(([key, value], idx) => {
    fields.push(`${key} = $${idx + 1}`);
    values.push(value);
  });

  if (fields.length === 0) {
    const existing = await getZone(id);
    if (!existing) throw new Error('Zone not found');
    return existing;
  }

  fields.push(`updated_at = $${fields.length + 1}`);
  values.push(new Date().toISOString());

  values.push(id);

  await sxtExecute(
    `UPDATE zones SET ${fields.join(', ')} WHERE id = $${fields.length + 1};`,
    values
  );

  const updated = await getZone(id);
  if (!updated) throw new Error('Failed to update zone');
  return updated;
}

export async function deleteZone(id: string): Promise<void> {
  await sxtExecute('DELETE FROM zones WHERE id = $1;', [id]);
}

export async function assignDriverToZone(driverId: string, zoneId: string): Promise<void> {
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
