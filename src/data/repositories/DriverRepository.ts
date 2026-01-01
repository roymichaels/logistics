import type { IDriverRepository } from '@/domain/drivers/repositories/IDriverRepository';
import type {
  Driver,
  DriverAssignment,
  DriverLocation,
  DriverPerformance,
  DriverEarnings,
} from '@/domain/drivers/entities';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export class DriverRepository implements IDriverRepository {
  constructor(private readonly dataStore: IDataStore) {}

  async getDrivers(filters?: {
    business_id?: string;
    status?: string;
    zone_id?: string;
  }): AsyncResult<Driver[], ClassifiedError> {
    try {
      logger.info('[DriverRepository] Fetching drivers', { filters });

      let query = this.dataStore.from('drivers').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        logger.error('[DriverRepository] Failed to fetch drivers', result.error);
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
      logger.error('[DriverRepository] Exception fetching drivers', error);
      return Err({
        message: error.message || 'Unexpected error fetching drivers',
        code: 'DRIVER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getDriverById(id: string): AsyncResult<Driver | null, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Fetching driver by ID', { id });

      const result = await this.dataStore
        .from('drivers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!result.success) {
        logger.error('[DriverRepository] Failed to fetch driver', result.error);
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
      logger.error('[DriverRepository] Exception fetching driver', error);
      return Err({
        message: error.message || 'Unexpected error fetching driver',
        code: 'DRIVER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getDriverByUserId(userId: string): AsyncResult<Driver | null, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Fetching driver by user ID', { userId });

      const result = await this.dataStore
        .from('drivers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!result.success) {
        logger.error('[DriverRepository] Failed to fetch driver by user ID', result.error);
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
      logger.error('[DriverRepository] Exception fetching driver by user ID', error);
      return Err({
        message: error.message || 'Unexpected error fetching driver',
        code: 'DRIVER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createDriver(
    driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>
  ): AsyncResult<Driver, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Creating driver', { driver });

      const result = await this.dataStore
        .from('drivers')
        .insert(driver)
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to create driver',
          code: 'DRIVER_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdDriver = result.data as Driver;

      DomainEvents.emit({
        type: 'driver.created',
        payload: { driverId: createdDriver.id, userId: createdDriver.user_id },
        timestamp: Date.now(),
      });

      return Ok(createdDriver);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception creating driver', error);
      return Err({
        message: error.message || 'Unexpected error creating driver',
        code: 'DRIVER_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateDriverStatus(
    id: string,
    status: 'available' | 'busy' | 'offline' | 'on_break'
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Updating driver status', { id, status });

      const result = await this.dataStore
        .from('drivers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to update driver status',
          code: 'DRIVER_STATUS_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.status_updated',
        payload: { driverId: id, status },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception updating driver status', error);
      return Err({
        message: error.message || 'Unexpected error updating driver status',
        code: 'DRIVER_STATUS_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateDriverLocation(
    id: string,
    location: { lat: number; lng: number }
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Updating driver location', { id, location });

      const result = await this.dataStore
        .from('drivers')
        .update({ current_location: location, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to update driver location',
          code: 'DRIVER_LOCATION_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.location_updated',
        payload: { driverId: id, location },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception updating driver location', error);
      return Err({
        message: error.message || 'Unexpected error updating driver location',
        code: 'DRIVER_LOCATION_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getDriverAssignments(filters?: {
    driver_id?: string;
    order_id?: string;
    status?: string;
  }): AsyncResult<DriverAssignment[], ClassifiedError> {
    try {
      logger.info('[DriverRepository] Fetching driver assignments', { filters });

      let query = this.dataStore.from('driver_assignments').select('*');

      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters?.order_id) {
        query = query.eq('order_id', filters.order_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const result = await query.order('assigned_at', { ascending: false });

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch driver assignments',
          code: 'ASSIGNMENT_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as DriverAssignment[]);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception fetching driver assignments', error);
      return Err({
        message: error.message || 'Unexpected error fetching driver assignments',
        code: 'ASSIGNMENT_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createAssignment(
    assignment: Omit<DriverAssignment, 'id' | 'created_at' | 'updated_at'>
  ): AsyncResult<DriverAssignment, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Creating driver assignment', { assignment });

      const result = await this.dataStore
        .from('driver_assignments')
        .insert({ ...assignment, status: 'assigned', assigned_at: new Date().toISOString() })
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to create driver assignment',
          code: 'ASSIGNMENT_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdAssignment = result.data as DriverAssignment;

      DomainEvents.emit({
        type: 'driver.assignment_created',
        payload: {
          assignmentId: createdAssignment.id,
          driverId: createdAssignment.driver_id,
          orderId: createdAssignment.order_id,
        },
        timestamp: Date.now(),
      });

      return Ok(createdAssignment);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception creating driver assignment', error);
      return Err({
        message: error.message || 'Unexpected error creating driver assignment',
        code: 'ASSIGNMENT_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async acceptAssignment(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Accepting driver assignment', { id });

      const result = await this.dataStore
        .from('driver_assignments')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'assigned');

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to accept assignment',
          code: 'ASSIGNMENT_ACCEPT_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.assignment_accepted',
        payload: { assignmentId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception accepting assignment', error);
      return Err({
        message: error.message || 'Unexpected error accepting assignment',
        code: 'ASSIGNMENT_ACCEPT_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async startAssignment(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Starting driver assignment', { id });

      const result = await this.dataStore
        .from('driver_assignments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'accepted');

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to start assignment',
          code: 'ASSIGNMENT_START_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.assignment_started',
        payload: { assignmentId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception starting assignment', error);
      return Err({
        message: error.message || 'Unexpected error starting assignment',
        code: 'ASSIGNMENT_START_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async completeAssignment(id: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Completing driver assignment', { id });

      const result = await this.dataStore
        .from('driver_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'in_progress');

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to complete assignment',
          code: 'ASSIGNMENT_COMPLETE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.assignment_completed',
        payload: { assignmentId: id },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception completing assignment', error);
      return Err({
        message: error.message || 'Unexpected error completing assignment',
        code: 'ASSIGNMENT_COMPLETE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async cancelAssignment(id: string, reason?: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Cancelling driver assignment', { id, reason });

      const result = await this.dataStore
        .from('driver_assignments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .in('status', ['assigned', 'accepted']);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to cancel assignment',
          code: 'ASSIGNMENT_CANCEL_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.assignment_cancelled',
        payload: { assignmentId: id, reason },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception cancelling assignment', error);
      return Err({
        message: error.message || 'Unexpected error cancelling assignment',
        code: 'ASSIGNMENT_CANCEL_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getDriverPerformance(
    driverId: string,
    startDate: string,
    endDate: string
  ): AsyncResult<DriverPerformance, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Fetching driver performance', { driverId, startDate, endDate });

      const result = await this.dataStore
        .from('driver_assignments')
        .select('*')
        .eq('driver_id', driverId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch driver performance',
          code: 'PERFORMANCE_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const assignments = result.data as DriverAssignment[];
      const completed = assignments.filter(a => a.status === 'completed');
      const cancelled = assignments.filter(a => a.status === 'cancelled');

      const durations = completed
        .filter(a => a.started_at && a.completed_at)
        .map(a => {
          const start = new Date(a.started_at!).getTime();
          const end = new Date(a.completed_at!).getTime();
          return end - start;
        });

      const averageDeliveryTime =
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0;

      const performance: DriverPerformance = {
        driver_id: driverId,
        period_start: startDate,
        period_end: endDate,
        total_deliveries: assignments.length,
        completed_deliveries: completed.length,
        cancelled_deliveries: cancelled.length,
        average_rating: 0,
        total_earnings: 0,
        average_delivery_time: averageDeliveryTime,
      };

      return Ok(performance);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception fetching driver performance', error);
      return Err({
        message: error.message || 'Unexpected error fetching driver performance',
        code: 'PERFORMANCE_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getDriverEarnings(filters?: {
    driver_id?: string;
    paid?: boolean;
    start_date?: string;
    end_date?: string;
  }): AsyncResult<DriverEarnings[], ClassifiedError> {
    try {
      logger.info('[DriverRepository] Fetching driver earnings', { filters });

      let query = this.dataStore.from('driver_earnings').select('*');

      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters?.paid !== undefined) {
        query = query.eq('paid', filters.paid);
      }
      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch driver earnings',
          code: 'EARNINGS_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as DriverEarnings[]);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception fetching driver earnings', error);
      return Err({
        message: error.message || 'Unexpected error fetching driver earnings',
        code: 'EARNINGS_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async recordEarnings(
    earnings: Omit<DriverEarnings, 'id' | 'created_at'>
  ): AsyncResult<DriverEarnings, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Recording driver earnings', { earnings });

      const result = await this.dataStore
        .from('driver_earnings')
        .insert(earnings)
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to record earnings',
          code: 'EARNINGS_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdEarnings = result.data as DriverEarnings;

      DomainEvents.emit({
        type: 'driver.earnings_recorded',
        payload: {
          earningsId: createdEarnings.id,
          driverId: createdEarnings.driver_id,
          amount: createdEarnings.total_amount,
        },
        timestamp: Date.now(),
      });

      return Ok(createdEarnings);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception recording earnings', error);
      return Err({
        message: error.message || 'Unexpected error recording earnings',
        code: 'EARNINGS_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async markEarningsAsPaid(earningsIds: string[]): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverRepository] Marking earnings as paid', { earningsIds });

      const result = await this.dataStore
        .from('driver_earnings')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .in('id', earningsIds);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to mark earnings as paid',
          code: 'EARNINGS_PAID_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.earnings_paid',
        payload: { earningsIds },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverRepository] Exception marking earnings as paid', error);
      return Err({
        message: error.message || 'Unexpected error marking earnings as paid',
        code: 'EARNINGS_PAID_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
