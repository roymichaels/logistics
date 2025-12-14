import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface Driver {
  id: string;
  user_id: string;
  status: 'available' | 'busy' | 'offline';
  current_location?: { lat: number; lng: number };
  vehicle_type?: string;
  rating?: number;
  total_deliveries?: number;
  created_at: string;
  updated_at: string;
}

export class DriverQueries {
  constructor(private dataStore: IDataStore) {}

  async getDrivers(filters?: {
    status?: string;
    available_only?: boolean;
  }): AsyncResult<Driver[], ClassifiedError> {
    try {
      logger.info('[DriverQueries] Fetching drivers', { filters });

      let query = this.dataStore.from('drivers').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.available_only) {
        query = query.eq('status', 'available');
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        logger.error('[DriverQueries] Failed to fetch drivers', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch drivers',
          code: 'DRIVER_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Driver[]);
    } catch (error: any) {
      logger.error('[DriverQueries] Exception fetching drivers', error);
      return Err({
        message: error.message || 'Unexpected error fetching drivers',
        code: 'DRIVER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getDriverById(driverId: string): AsyncResult<Driver | null, ClassifiedError> {
    try {
      logger.info('[DriverQueries] Fetching driver by ID', { driverId });

      const result = await this.dataStore
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .maybeSingle();

      if (!result.success) {
        logger.error('[DriverQueries] Failed to fetch driver', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch driver',
          code: 'DRIVER_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Driver | null);
    } catch (error: any) {
      logger.error('[DriverQueries] Exception fetching driver', error);
      return Err({
        message: error.message || 'Unexpected error fetching driver',
        code: 'DRIVER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getAvailableDriversNearby(location: { lat: number; lng: number }, radiusKm: number = 10): AsyncResult<Driver[], ClassifiedError> {
    try {
      logger.info('[DriverQueries] Fetching nearby drivers', { location, radiusKm });

      const result = await this.dataStore
        .from('drivers')
        .select('*')
        .eq('status', 'available');

      if (!result.success) {
        return Err({
          message: 'Failed to fetch nearby drivers',
          code: 'NEARBY_DRIVERS_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      const drivers = result.data as Driver[];

      const nearbyDrivers = drivers.filter(driver => {
        if (!driver.current_location) return false;
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          driver.current_location.lat,
          driver.current_location.lng
        );
        return distance <= radiusKm;
      });

      return Ok(nearbyDrivers);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to find nearby drivers',
        code: 'NEARBY_DRIVERS_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
