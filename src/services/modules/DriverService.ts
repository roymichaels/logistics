/**
 * Driver Service
 *
 * Handles all driver-related operations:
 * - Driver status management
 * - Driver inventory
 * - Driver movements and logs
 * - Driver availability
 */

import { BaseService } from '../base/BaseService';
import {
  DriverStatusRecord,
  DriverAvailabilityStatus,
  DriverInventoryRecord,
  DriverInventorySyncInput,
  DriverInventorySyncResult,
  DriverInventoryTransferInput,
  DriverInventoryAdjustmentInput,
  DriverMovementLog,
  DriverMovementAction,
  Zone,
  Product,
  DriverInventoryRow,
  DriverStatusRow
} from '../../data/types';

export class DriverService extends BaseService {
  // Driver Status
  async updateDriverStatus(input: {
    status: DriverAvailabilityStatus;
    driver_id?: string;
    zone_id?: string | null;
    is_online?: boolean;
    note?: string;
  }): Promise<void> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = this.now();

    const payload: {
      driver_id: string;
      status: DriverAvailabilityStatus;
      is_online: boolean;
      note: string | null;
      last_updated: string;
      current_zone_id?: string | null;
    } = {
      driver_id: driverId,
      status: input.status,
      is_online: typeof input.is_online === 'boolean' ? input.is_online : input.status !== 'off_shift',
      note: input.note ?? null,
      last_updated: now
    };

    if (typeof input.zone_id !== 'undefined') {
      payload.current_zone_id = input.zone_id;
    }

    const { error } = await this.supabase
      .from('driver_status')
      .upsert(payload, { onConflict: 'driver_id' });

    if (error) throw error;
  }

  async setDriverOnline(input?: {
    driver_id?: string;
    zone_id?: string | null;
    status?: DriverAvailabilityStatus;
    note?: string;
  }): Promise<void> {
    const driverId = input?.driver_id || this.userTelegramId;
    const existingStatus = await this.getDriverStatus(driverId);
    const hasZoneOverride = input && Object.prototype.hasOwnProperty.call(input, 'zone_id');
    const zoneId = hasZoneOverride ? input?.zone_id ?? null : existingStatus?.current_zone_id ?? null;
    const status: DriverAvailabilityStatus = input?.status || (existingStatus?.status === 'off_shift' ? 'available' : existingStatus?.status || 'available');

    await this.updateDriverStatus({
      driver_id: driverId,
      status,
      zone_id: zoneId,
      is_online: true,
      note: input?.note ?? existingStatus?.note ?? undefined
    });
  }

  async setDriverOffline(input?: { driver_id?: string; note?: string }): Promise<void> {
    const driverId = input?.driver_id || this.userTelegramId;
    const existingStatus = await this.getDriverStatus(driverId);

    await this.updateDriverStatus({
      driver_id: driverId,
      status: 'off_shift',
      zone_id: null,
      is_online: false,
      note: input?.note ?? existingStatus?.note ?? undefined
    });
  }

  async toggleDriverOnline(input: {
    driver_id?: string;
    zone_id?: string | null;
    is_online: boolean;
    status?: DriverAvailabilityStatus;
    note?: string;
  }): Promise<void> {
    if (input.is_online) {
      await this.setDriverOnline({
        driver_id: input.driver_id,
        zone_id: typeof input.zone_id === 'undefined' ? undefined : input.zone_id,
        status: input.status,
        note: input.note
      });
    } else {
      await this.setDriverOffline({
        driver_id: input.driver_id,
        note: input.note
      });
    }
  }

  async getDriverStatus(driver_id?: string): Promise<DriverStatusRecord | null> {
    const targetDriver = driver_id || this.userTelegramId;

    const { data, error } = await this.supabase
      .from('driver_status')
      .select('*')
      .eq('driver_id', targetDriver)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let zone: Zone | undefined;
    if (data.current_zone_id) {
      const { data: zoneData } = await this.supabase
        .from('zones')
        .select('*')
        .eq('id', data.current_zone_id)
        .maybeSingle();

      if (zoneData) {
        zone = zoneData;
      }
    }

    return {
      driver_id: data.driver_id,
      status: data.status as DriverAvailabilityStatus,
      is_online: data.is_online,
      current_zone_id: data.current_zone_id,
      last_updated: data.last_updated,
      note: data.note,
      zone
    };
  }

  async listDriverStatuses(filters?: { zone_id?: string; onlyOnline?: boolean }): Promise<DriverStatusRecord[]> {
    let query = this.supabase.from('driver_status').select('*');

    if (filters?.zone_id) {
      query = query.eq('current_zone_id', filters.zone_id);
    }

    if (filters?.onlyOnline) {
      query = query.eq('is_online', true);
    }

    query = query.order('last_updated', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const zoneIds = Array.from(
      new Set(
        rows
          .map((row: DriverStatusRow) => row.current_zone_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    let zoneMap = new Map<string, Zone>();
    if (zoneIds.length > 0) {
      const { data: zoneData, error: zoneError } = await this.supabase
        .from('zones')
        .select('*')
        .in('id', zoneIds);

      if (zoneError) throw zoneError;

      (zoneData || []).forEach((zone: Zone) => {
        zoneMap.set(zone.id, zone);
      });
    }

    return rows.map((row: DriverStatusRow) => ({
      driver_id: row.driver_id,
      status: row.status as DriverAvailabilityStatus,
      is_online: row.is_online,
      current_zone_id: row.current_zone_id,
      last_updated: row.last_updated,
      note: row.note,
      zone: row.current_zone_id ? zoneMap.get(row.current_zone_id) : undefined
    }));
  }

  // Driver Inventory
  async listDriverInventory(filters?: {
    driver_ids?: string[];
    driver_id?: string;
    product_id?: string;
  }): Promise<DriverInventoryRecord[]> {
    let query = this.supabase
      .from('driver_inventory')
      .select('*, location:inventory_locations(*), product:products(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.driver_ids && filters.driver_ids.length > 0) {
      query = query.in('driver_id', filters.driver_ids);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: DriverInventoryRow) => ({
      id: row.driver_id + '_' + row.product_id,
      driver_id: row.driver_id,
      product_id: row.product_id,
      quantity: row.quantity ?? 0,
      updated_at: row.updated_at,
      location_id: row.location_id ?? null,
      location: row.location || undefined,
      product: row.product || undefined
    }));
  }

  async transferInventoryToDriver(input: DriverInventoryTransferInput): Promise<void> {
    if (input.quantity <= 0) {
      throw new Error('יש להעביר כמות חיובית');
    }

    const { error } = await this.supabase.rpc('transfer_inventory_to_driver', {
      p_driver_id: input.driver_id,
      p_product_id: input.product_id,
      p_quantity: input.quantity,
      p_actor: this.userTelegramId,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async adjustDriverInventory(input: DriverInventoryAdjustmentInput): Promise<void> {
    const now = this.now();

    const { data: existing, error: fetchError } = await this.supabase
      .from('driver_inventory')
      .select('id, quantity, location_id')
      .eq('driver_id', input.driver_id)
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentQuantity = existing?.quantity ?? 0;
    const newQuantity = currentQuantity + input.quantity_change;

    if (newQuantity < 0) {
      throw new Error('לא ניתן להוריד את המלאי של הנהג מתחת לאפס');
    }

    const upsertPayload = existing
      ? { quantity: newQuantity, updated_at: now }
      : {
          driver_id: input.driver_id,
          product_id: input.product_id,
          quantity: newQuantity,
          updated_at: now
        };

    const { error: upsertError } = existing
      ? await this.supabase
          .from('driver_inventory')
          .update(upsertPayload)
          .eq('id', existing.id)
      : await this.supabase
          .from('driver_inventory')
          .insert(upsertPayload);

    if (upsertError) throw upsertError;

    const action: DriverMovementAction = input.quantity_change >= 0 ? 'inventory_added' : 'inventory_removed';
    const details = input.notes ? `${input.reason} - ${input.notes}` : input.reason;

    await this.recordDriverMovement({
      driver_id: input.driver_id,
      zone_id: input.zone_id ?? null,
      product_id: input.product_id,
      quantity_change: input.quantity_change,
      action,
      details
    });
  }

  async syncDriverInventory(input: DriverInventorySyncInput): Promise<DriverInventorySyncResult> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = this.now();

    const normalizedEntries = new Map<string, { quantity: number; location_id?: string | null }>();
    for (const entry of input.entries || []) {
      if (!entry || !entry.product_id) continue;
      const quantity = Math.max(0, Math.round(Number(entry.quantity) || 0));
      const existing = normalizedEntries.get(entry.product_id) || { quantity: 0, location_id: entry.location_id };
      existing.quantity = quantity;
      if (typeof entry.location_id !== 'undefined') {
        existing.location_id = entry.location_id;
      }
      normalizedEntries.set(entry.product_id, existing);
    }

    const { data: currentRows, error: currentError } = await this.supabase
      .from('driver_inventory')
      .select('id, product_id, quantity, location_id')
      .eq('driver_id', driverId);

    if (currentError) throw currentError;

    const existingMap = new Map<string, { id: string; product_id: string; quantity: number; location_id?: string | null }>();
    (currentRows || []).forEach((row: { id: string; product_id: string; quantity: number; location_id?: string | null }) => {
      existingMap.set(row.product_id, {
        id: row.id,
        product_id: row.product_id,
        quantity: row.quantity ?? 0,
        location_id: row.location_id ?? null
      });
    });

    const upserts: Array<{
      driver_id: string;
      product_id: string;
      quantity: number;
      location_id: string | null;
      updated_at: string;
    }> = [];
    const deletions: { id: string; product_id: string; quantity: number }[] = [];
    const movements: { product_id: string; delta: number }[] = [];

    normalizedEntries.forEach((entry, productId) => {
      const existing = existingMap.get(productId);
      const locationId = entry.location_id ?? existing?.location_id ?? null;

      if (entry.quantity === 0) {
        if (existing) {
          deletions.push({ id: existing.id, product_id: productId, quantity: existing.quantity });
          movements.push({ product_id: productId, delta: -existing.quantity });
        }
        existingMap.delete(productId);
        return;
      }

      upserts.push({
        driver_id: driverId,
        product_id: productId,
        quantity: entry.quantity,
        location_id: locationId,
        updated_at: now
      });

      const previousQuantity = existing?.quantity ?? 0;
      const delta = entry.quantity - previousQuantity;
      if (delta !== 0) {
        movements.push({ product_id: productId, delta });
      }

      existingMap.delete(productId);
    });

    existingMap.forEach((row) => {
      deletions.push({ id: row.id, product_id: row.product_id, quantity: row.quantity });
      if (row.quantity !== 0) {
        movements.push({ product_id: row.product_id, delta: -row.quantity });
      }
    });

    if (upserts.length > 0) {
      const { error: upsertError } = await this.supabase
        .from('driver_inventory')
        .upsert(upserts, { onConflict: 'driver_id,product_id' });
      if (upsertError) throw upsertError;
    }

    if (deletions.length > 0) {
      const { error: deleteError } = await this.supabase
        .from('driver_inventory')
        .delete()
        .in('id', deletions.map((item) => item.id));
      if (deleteError) throw deleteError;
    }

    if (movements.length > 0) {
      const zoneId = typeof input.zone_id === 'undefined' ? null : input.zone_id;
      const baseDetails = input.note || 'Driver inventory sync';

      for (const movement of movements) {
        if (!movement.delta) continue;
        await this.recordDriverMovement({
          driver_id: driverId,
          zone_id: zoneId,
          product_id: movement.product_id,
          quantity_change: movement.delta,
          action: movement.delta > 0 ? 'inventory_added' : 'inventory_removed',
          details: `${baseDetails} (${movement.delta > 0 ? '+' : ''}${movement.delta})`
        });
      }
    }

    return { updated: upserts.length, removed: deletions.length };
  }

  // Driver Movements
  async recordDriverMovement(input: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('driver_movements')
      .insert({
        driver_id: input.driver_id,
        zone_id: input.zone_id ?? null,
        product_id: input.product_id ?? null,
        quantity_change: input.quantity_change ?? null,
        action: input.action,
        details: input.details || null,
        created_at: this.now()
      });

    if (error) throw error;
  }

  async listDriverMovements(filters?: {
    driver_id?: string;
    zone_id?: string;
    limit?: number;
  }): Promise<DriverMovementLog[]> {
    let query = this.supabase.from('driver_movements').select('*');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    const zoneIds = Array.from(new Set(rows.map(row => row.zone_id as string | null).filter((id): id is string => Boolean(id))));
    const productIds = Array.from(new Set(rows.map(row => row.product_id as string | null).filter((id): id is string => Boolean(id))));

    let zoneMap = new Map<string, Zone>();
    if (zoneIds.length > 0) {
      const { data: zoneData, error: zoneError } = await this.supabase
        .from('zones')
        .select('*')
        .in('id', zoneIds);

      if (zoneError) throw zoneError;

      (zoneData || []).forEach((zone: Zone) => {
        zoneMap.set(zone.id, zone);
      });
    }

    let productMap = new Map<string, Product>();
    if (productIds.length > 0) {
      const { data: productData, error: productError } = await this.supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productError) throw productError;

      (productData || []).forEach((product: Product) => {
        productMap.set(product.id, product);
      });
    }

    return rows.map(row => ({
      id: row.id,
      driver_id: row.driver_id,
      zone_id: row.zone_id,
      product_id: row.product_id,
      quantity_change: row.quantity_change,
      action: row.action as DriverMovementAction,
      details: row.details,
      created_at: row.created_at,
      zone: row.zone_id ? zoneMap.get(row.zone_id) : undefined,
      product: row.product_id ? productMap.get(row.product_id) : undefined
    }));
  }
}
