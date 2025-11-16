/**
 * Zone Service
 *
 * Handles all zone-related operations:
 * - Zone management (CRUD)
 * - Zone assignments
 * - Zone audit logs
 * - Zone coverage tracking
 */

import { BaseService } from '../base/BaseService';
import {
  Zone,
  CreateZoneInput,
  UpdateZoneInput,
  ZoneAuditLog,
  DriverZoneAssignment,
  ZoneRow,
  DriverZoneAssignmentRow
} from '../../data/types';

export class ZoneService extends BaseService {
  async listZones(filters?: {
    business_id?: string;
    city?: string;
    region?: string;
    includeDeleted?: boolean;
  }): Promise<Zone[]> {
    let query = this.supabase.from('zones').select('*');

    if (!filters?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.region) {
      query = query.eq('region', filters.region);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getZone(id: string): Promise<Zone | null> {
    const { data, error } = await this.supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async createZone(input: CreateZoneInput): Promise<{ id: string }> {
    const now = this.now();

    const zoneData = {
      name: input.name,
      code: input.code || null,
      description: input.description || null,
      color: input.color || null,
      city: input.city || null,
      region: input.region || null,
      polygon: input.polygon || null,
      business_id: input.business_id || null,
      metadata: input.metadata || {},
      active: input.active !== undefined ? input.active : true,
      created_by: this.userTelegramId,
      updated_by: this.userTelegramId,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await this.supabase
      .from('zones')
      .insert(zoneData)
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async updateZone(id: string, input: UpdateZoneInput): Promise<void> {
    const updateData = {
      ...input,
      updated_by: this.userTelegramId,
      updated_at: this.now()
    };

    const { error } = await this.supabase
      .from('zones')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async deleteZone(id: string, softDelete: boolean = true): Promise<void> {
    if (softDelete) {
      const { error } = await this.supabase
        .from('zones')
        .update({
          deleted_at: this.now(),
          updated_by: this.userTelegramId
        })
        .eq('id', id);

      if (error) throw error;
    } else {
      const { error } = await this.supabase.from('zones').delete().eq('id', id);
      if (error) throw error;
    }
  }

  async restoreZone(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('zones')
      .update({
        deleted_at: null,
        updated_by: this.userTelegramId,
        updated_at: this.now()
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getZoneAuditLogs(zoneId: string, limit: number = 50): Promise<ZoneAuditLog[]> {
    const { data, error } = await this.supabase
      .from('zone_audit_logs')
      .select('*')
      .eq('zone_id', zoneId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async listDriverZones(filters?: {
    driver_id?: string;
    zone_id?: string;
    activeOnly?: boolean;
  }): Promise<DriverZoneAssignment[]> {
    let query = this.supabase.from('driver_zones').select('*, zones(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }

    if (filters?.activeOnly) {
      query = query.eq('active', true);
    }

    query = query.order('assigned_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: DriverZoneAssignmentRow) => ({
      id: row.id,
      driver_id: row.driver_id,
      zone_id: row.zone_id,
      active: row.active,
      assigned_at: row.assigned_at,
      unassigned_at: row.unassigned_at,
      assigned_by: row.assigned_by,
      zone: row.zone as Zone | undefined
    }));
  }

  async assignDriverToZone(input: {
    zone_id: string;
    driver_id?: string;
    active?: boolean;
  }): Promise<void> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = this.now();

    const { data: existing, error: fetchError } = await this.supabase
      .from('driver_zones')
      .select('id, active, assigned_at')
      .eq('driver_id', driverId)
      .eq('zone_id', input.zone_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const makeActive = input.active !== false;

    if (existing) {
      const updatePayload: { active: boolean; assigned_at?: string; unassigned_at?: string | null } = {
        active: makeActive
      };
      if (makeActive) {
        updatePayload.assigned_at = now;
        updatePayload.unassigned_at = null;
      } else {
        updatePayload.unassigned_at = now;
      }

      const { error: updateError } = await this.supabase
        .from('driver_zones')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else if (makeActive) {
      const { error: insertError } = await this.supabase.from('driver_zones').insert({
        driver_id: driverId,
        zone_id: input.zone_id,
        active: true,
        assigned_at: now,
        assigned_by: this.userTelegramId
      });

      if (insertError) throw insertError;
    }
  }

  async unassignDriverFromZone(input: { zone_id: string; driver_id?: string }): Promise<void> {
    await this.assignDriverToZone({
      zone_id: input.zone_id,
      driver_id: input.driver_id,
      active: false
    });
  }
}
