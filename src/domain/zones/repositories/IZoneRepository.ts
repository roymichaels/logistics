import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { Zone, ZoneAssignment, GeoPolygon } from '../entities';

export interface IZoneRepository {
  getZones(filters?: {
    business_id?: string;
    is_active?: boolean;
  }): AsyncResult<Zone[], ClassifiedError>;

  getZoneById(id: string): AsyncResult<Zone | null, ClassifiedError>;

  createZone(zone: Omit<Zone, 'id' | 'created_at' | 'updated_at'>): AsyncResult<Zone, ClassifiedError>;

  updateZone(id: string, updates: Partial<Omit<Zone, 'id' | 'created_at' | 'updated_at'>>): AsyncResult<void, ClassifiedError>;

  deleteZone(id: string): AsyncResult<void, ClassifiedError>;

  activateZone(id: string): AsyncResult<void, ClassifiedError>;

  deactivateZone(id: string): AsyncResult<void, ClassifiedError>;

  updateZonePolygon(id: string, polygon: GeoPolygon): AsyncResult<void, ClassifiedError>;

  getZoneAssignments(filters?: {
    zone_id?: string;
    driver_id?: string;
    business_id?: string;
    is_active?: boolean;
  }): AsyncResult<ZoneAssignment[], ClassifiedError>;

  createZoneAssignment(assignment: Omit<ZoneAssignment, 'id' | 'created_at' | 'updated_at'>): AsyncResult<ZoneAssignment, ClassifiedError>;

  activateZoneAssignment(id: string): AsyncResult<void, ClassifiedError>;

  deactivateZoneAssignment(id: string): AsyncResult<void, ClassifiedError>;

  deleteZoneAssignment(id: string): AsyncResult<void, ClassifiedError>;
}
