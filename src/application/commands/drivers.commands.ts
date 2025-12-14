import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export interface StartShiftInput {
  driver_id: string;
  location: { lat: number; lng: number };
}

export interface UpdateLocationInput {
  driver_id: string;
  location: { lat: number; lng: number };
}

export class DriverCommands {
  constructor(private dataStore: IDataStore) {}

  async startShift(input: StartShiftInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverCommands] Starting shift', { input });

      const result = await this.dataStore
        .from('drivers')
        .update({
          status: 'available',
          current_location: input.location,
        })
        .eq('id', input.driver_id);

      if (!result.success) {
        logger.error('[DriverCommands] Failed to start shift', result.error);
        return Err({
          message: result.error.message || 'Failed to start shift',
          code: 'SHIFT_START_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.shift_started',
        payload: { driverId: input.driver_id, location: input.location },
        timestamp: Date.now(),
      });

      logger.info('[DriverCommands] Shift started successfully', { driverId: input.driver_id });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverCommands] Exception starting shift', error);
      return Err({
        message: error.message || 'Unexpected error starting shift',
        code: 'SHIFT_START_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async endShift(driverId: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverCommands] Ending shift', { driverId });

      const result = await this.dataStore
        .from('drivers')
        .update({
          status: 'offline',
        })
        .eq('id', driverId);

      if (!result.success) {
        logger.error('[DriverCommands] Failed to end shift', result.error);
        return Err({
          message: result.error.message || 'Failed to end shift',
          code: 'SHIFT_END_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.shift_ended',
        payload: { driverId },
        timestamp: Date.now(),
      });

      logger.info('[DriverCommands] Shift ended successfully', { driverId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverCommands] Exception ending shift', error);
      return Err({
        message: error.message || 'Unexpected error ending shift',
        code: 'SHIFT_END_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateLocation(input: UpdateLocationInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverCommands] Updating location', { input });

      const result = await this.dataStore
        .from('drivers')
        .update({
          current_location: input.location,
        })
        .eq('id', input.driver_id);

      if (!result.success) {
        logger.error('[DriverCommands] Failed to update location', result.error);
        return Err({
          message: result.error.message || 'Failed to update location',
          code: 'LOCATION_UPDATE_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'driver.location_updated',
        payload: { driverId: input.driver_id, location: input.location },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverCommands] Exception updating location', error);
      return Err({
        message: error.message || 'Unexpected error updating location',
        code: 'LOCATION_UPDATE_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async acceptDelivery(driverId: string, orderId: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverCommands] Accepting delivery', { driverId, orderId });

      const updateDriverResult = await this.dataStore
        .from('drivers')
        .update({ status: 'busy' })
        .eq('id', driverId);

      if (!updateDriverResult.success) {
        return Err({
          message: 'Failed to update driver status',
          code: 'DRIVER_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const updateOrderResult = await this.dataStore
        .from('orders')
        .update({ status: 'in_transit', driver_id: driverId })
        .eq('id', orderId);

      if (!updateOrderResult.success) {
        return Err({
          message: 'Failed to update order status',
          code: 'ORDER_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      DomainEvents.emit({
        type: 'delivery.accepted',
        payload: { driverId, orderId },
        timestamp: Date.now(),
      });

      logger.info('[DriverCommands] Delivery accepted successfully', { driverId, orderId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverCommands] Exception accepting delivery', error);
      return Err({
        message: error.message || 'Unexpected error accepting delivery',
        code: 'DELIVERY_ACCEPT_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async completeDelivery(driverId: string, orderId: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[DriverCommands] Completing delivery', { driverId, orderId });

      const updateDriverResult = await this.dataStore
        .from('drivers')
        .update({ status: 'available' })
        .eq('id', driverId);

      if (!updateDriverResult.success) {
        return Err({
          message: 'Failed to update driver status',
          code: 'DRIVER_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const updateOrderResult = await this.dataStore
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (!updateOrderResult.success) {
        return Err({
          message: 'Failed to update order status',
          code: 'ORDER_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const incrementResult = await this.dataStore.rpc('increment_driver_deliveries', {
        driver_id: driverId,
      });

      DomainEvents.emit({
        type: 'delivery.completed',
        payload: { driverId, orderId },
        timestamp: Date.now(),
      });

      logger.info('[DriverCommands] Delivery completed successfully', { driverId, orderId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[DriverCommands] Exception completing delivery', error);
      return Err({
        message: error.message || 'Unexpected error completing delivery',
        code: 'DELIVERY_COMPLETE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
