import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type {
  Driver,
  DriverAssignment,
  DriverLocation,
  DriverPerformance,
  DriverEarnings,
} from '../entities';

export interface IDriverRepository {
  getDrivers(filters?: {
    business_id?: string;
    status?: string;
    zone_id?: string;
  }): AsyncResult<Driver[], ClassifiedError>;

  getDriverById(id: string): AsyncResult<Driver | null, ClassifiedError>;

  getDriverByUserId(userId: string): AsyncResult<Driver | null, ClassifiedError>;

  createDriver(driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): AsyncResult<Driver, ClassifiedError>;

  updateDriverStatus(id: string, status: 'available' | 'busy' | 'offline' | 'on_break'): AsyncResult<void, ClassifiedError>;

  updateDriverLocation(id: string, location: { lat: number; lng: number }): AsyncResult<void, ClassifiedError>;

  getDriverAssignments(filters?: {
    driver_id?: string;
    order_id?: string;
    status?: string;
  }): AsyncResult<DriverAssignment[], ClassifiedError>;

  createAssignment(assignment: Omit<DriverAssignment, 'id' | 'created_at' | 'updated_at'>): AsyncResult<DriverAssignment, ClassifiedError>;

  acceptAssignment(id: string): AsyncResult<void, ClassifiedError>;

  startAssignment(id: string): AsyncResult<void, ClassifiedError>;

  completeAssignment(id: string): AsyncResult<void, ClassifiedError>;

  cancelAssignment(id: string, reason?: string): AsyncResult<void, ClassifiedError>;

  getDriverPerformance(driverId: string, startDate: string, endDate: string): AsyncResult<DriverPerformance, ClassifiedError>;

  getDriverEarnings(filters?: {
    driver_id?: string;
    paid?: boolean;
    start_date?: string;
    end_date?: string;
  }): AsyncResult<DriverEarnings[], ClassifiedError>;

  recordEarnings(earnings: Omit<DriverEarnings, 'id' | 'created_at'>): AsyncResult<DriverEarnings, ClassifiedError>;

  markEarningsAsPaid(earningsIds: string[]): AsyncResult<void, ClassifiedError>;
}
