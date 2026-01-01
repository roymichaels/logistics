import type { IZoneRepository } from '@/domain/zones/repositories/IZoneRepository';
import type { Zone, ZoneAssignment, GeoPolygon } from '@/domain/zones/entities';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export class ZoneRepository implements IZoneRepository {
  constructor(private readonly dataStore: IDataStore) {}

  async getZones(filters?: {
    business_id?: string;
    is_active?: boolean;
  }): AsyncResult<Zone[], ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Fetching zones', { filters });

      let query = this.dataStore.from('zones').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const result = await query.order('name', { ascending: true });

      if (!result.success) {
        logger.error('[ZoneRepository] Failed to fetch zones', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch zones',
          code: 'ZONE_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Zone[]);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception fetching zones', error);
      return Err({
        message: error.message || 'Unexpected error fetching zones',
        code: 'ZONE_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getZoneById(id: string): AsyncResult<Zone | null, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Fetching zone by ID', { id });

      const result = await this.dataStore
        .from('zones')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!result.success) {
        logger.error('[ZoneRepository] Failed to fetch zone', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch zone',
          code: 'ZONE_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Zone | null);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception fetching zone', error);
      return Err({
        message: error.message || 'Unexpected error fetching zone',
        code: 'ZONE_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createZone(
    zone: Omit<Zone, 'id' | 'created_at' | 'updated_at'>
  ): AsyncResult<Zone, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Creating zone', { zone });

      const result = await this.dataStore
        .from('zones')
        .insert(zone)
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to create zone',
          code: 'ZONE_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdZone = result.data as Zone;

      DomainEvents.emit({
        type: 'zone.created',
        payload: { zoneId: createdZone.id, businessId: createdZone.business_id },
        timestamp: Date.now(),
      });

      return Ok(createdZone);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception creating zone', error);
      return Err({
        message: error.message || 'Unexpected error creating zone',
        code: 'ZONE_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateZone(
    id: string,
    updates: Partial<Omit<Zone, 'id' | 'created_at' | 'updated_at'>>
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Updating zone', { id, updates });

      const result = await this.dataStore
        .from('zones')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to update zone',
          code: 'ZONE_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.updated',
        payload: { zoneId: id, updates },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception updating zone', error);
      return Err({
        message: error.message || 'Unexpected error updating zone',
        code: 'ZONE_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async deleteZone(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Deleting zone', { id });

      const result = await this.dataStore
        .from('zones')
        .delete()
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to delete zone',
          code: 'ZONE_DELETE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.deleted',
        payload: { zoneId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception deleting zone', error);
      return Err({
        message: error.message || 'Unexpected error deleting zone',
        code: 'ZONE_DELETE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async activateZone(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Activating zone', { id });

      const result = await this.dataStore
        .from('zones')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to activate zone',
          code: 'ZONE_ACTIVATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.activated',
        payload: { zoneId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception activating zone', error);
      return Err({
        message: error.message || 'Unexpected error activating zone',
        code: 'ZONE_ACTIVATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async deactivateZone(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Deactivating zone', { id });

      const result = await this.dataStore
        .from('zones')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to deactivate zone',
          code: 'ZONE_DEACTIVATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.deactivated',
        payload: { zoneId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception deactivating zone', error);
      return Err({
        message: error.message || 'Unexpected error deactivating zone',
        code: 'ZONE_DEACTIVATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateZonePolygon(id: string, polygon: GeoPolygon): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Updating zone polygon', { id });

      const result = await this.dataStore
        .from('zones')
        .update({ polygon, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to update zone polygon',
          code: 'ZONE_POLYGON_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.polygon_updated',
        payload: { zoneId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception updating zone polygon', error);
      return Err({
        message: error.message || 'Unexpected error updating zone polygon',
        code: 'ZONE_POLYGON_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getZoneAssignments(filters?: {
    zone_id?: string;
    driver_id?: string;
    business_id?: string;
    is_active?: boolean;
  }): AsyncResult<ZoneAssignment[], ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Fetching zone assignments', { filters });

      let query = this.dataStore.from('zone_assignments').select('*');

      if (filters?.zone_id) {
        query = query.eq('zone_id', filters.zone_id);
      }
      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const result = await query.order('assigned_at', { ascending: false });

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch zone assignments',
          code: 'ZONE_ASSIGNMENT_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as ZoneAssignment[]);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception fetching zone assignments', error);
      return Err({
        message: error.message || 'Unexpected error fetching zone assignments',
        code: 'ZONE_ASSIGNMENT_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createZoneAssignment(
    assignment: Omit<ZoneAssignment, 'id' | 'created_at' | 'updated_at'>
  ): AsyncResult<ZoneAssignment, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Creating zone assignment', { assignment });

      const result = await this.dataStore
        .from('zone_assignments')
        .insert({ ...assignment, assigned_at: new Date().toISOString() })
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to create zone assignment',
          code: 'ZONE_ASSIGNMENT_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdAssignment = result.data as ZoneAssignment;

      DomainEvents.emit({
        type: 'zone.assignment_created',
        payload: {
          assignmentId: createdAssignment.id,
          zoneId: createdAssignment.zone_id,
          driverId: createdAssignment.driver_id,
        },
        timestamp: Date.now(),
      });

      return Ok(createdAssignment);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception creating zone assignment', error);
      return Err({
        message: error.message || 'Unexpected error creating zone assignment',
        code: 'ZONE_ASSIGNMENT_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async activateZoneAssignment(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Activating zone assignment', { id });

      const result = await this.dataStore
        .from('zone_assignments')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to activate zone assignment',
          code: 'ZONE_ASSIGNMENT_ACTIVATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.assignment_activated',
        payload: { assignmentId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception activating zone assignment', error);
      return Err({
        message: error.message || 'Unexpected error activating zone assignment',
        code: 'ZONE_ASSIGNMENT_ACTIVATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async deactivateZoneAssignment(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Deactivating zone assignment', { id });

      const result = await this.dataStore
        .from('zone_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to deactivate zone assignment',
          code: 'ZONE_ASSIGNMENT_DEACTIVATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.assignment_deactivated',
        payload: { assignmentId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception deactivating zone assignment', error);
      return Err({
        message: error.message || 'Unexpected error deactivating zone assignment',
        code: 'ZONE_ASSIGNMENT_DEACTIVATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async deleteZoneAssignment(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[ZoneRepository] Deleting zone assignment', { id });

      const result = await this.dataStore
        .from('zone_assignments')
        .delete()
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to delete zone assignment',
          code: 'ZONE_ASSIGNMENT_DELETE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'zone.assignment_deleted',
        payload: { assignmentId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[ZoneRepository] Exception deleting zone assignment', error);
      return Err({
        message: error.message || 'Unexpected error deleting zone assignment',
        code: 'ZONE_ASSIGNMENT_DELETE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
