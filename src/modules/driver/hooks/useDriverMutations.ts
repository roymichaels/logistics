import { useState } from 'react';
import { logger } from '../../../lib/logger';
import {
  Driver,
  DriverFormData,
  DriverUpdateData,
  DriverLocationUpdate,
  DriverStatus
} from '../types';

export interface UseDriverMutationsResult {
  createDriver: (data: DriverFormData) => Promise<Driver>;
  updateDriver: (id: string, data: DriverUpdateData) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  updateDriverStatus: (driverId: string, status: DriverStatus) => Promise<void>;
  updateDriverAvailability: (driverId: string, isAvailable: boolean) => Promise<void>;
  updateDriverLocation: (data: DriverLocationUpdate) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useDriverMutations(): UseDriverMutationsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createDriver = async (data: DriverFormData): Promise<Driver> => {
    setIsLoading(true);
    setError(null);

    try {
      const driver: Driver = {
        id: `driver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        status: 'offline',
        is_available: false,
        max_orders_capacity: data.max_orders_capacity || 5,
        rating: 5.0,
        total_deliveries: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const existingDrivers = JSON.parse(localStorage.getItem('drivers') || '[]');
      existingDrivers.push(driver);
      localStorage.setItem('drivers', JSON.stringify(existingDrivers));

      logger.info('Driver created:', driver.id);
      return driver;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create driver');
      setError(error);
      logger.error('Failed to create driver:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriver = async (id: string, data: DriverUpdateData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const existingDrivers: Driver[] = JSON.parse(localStorage.getItem('drivers') || '[]');
      const index = existingDrivers.findIndex(d => d.id === id);

      if (index === -1) {
        throw new Error('Driver not found');
      }

      existingDrivers[index] = {
        ...existingDrivers[index],
        ...data,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem('drivers', JSON.stringify(existingDrivers));
      logger.info('Driver updated:', id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update driver');
      setError(error);
      logger.error('Failed to update driver:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDriver = async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const existingDrivers: Driver[] = JSON.parse(localStorage.getItem('drivers') || '[]');
      const filtered = existingDrivers.filter(d => d.id !== id);
      localStorage.setItem('drivers', JSON.stringify(filtered));
      logger.info('Driver deleted:', id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete driver');
      setError(error);
      logger.error('Failed to delete driver:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriverStatus = async (driverId: string, status: DriverStatus): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await updateDriver(driverId, { status });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update driver status');
      setError(error);
      logger.error('Failed to update driver status:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriverAvailability = async (driverId: string, isAvailable: boolean): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await updateDriver(driverId, {
        is_available: isAvailable,
        status: isAvailable ? 'available' : 'offline'
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update driver availability');
      setError(error);
      logger.error('Failed to update driver availability:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriverLocation = async (data: DriverLocationUpdate): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const locations = JSON.parse(localStorage.getItem('driver_locations') || '[]');
      locations.push({
        id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        recorded_at: new Date().toISOString()
      });
      localStorage.setItem('driver_locations', JSON.stringify(locations));

      await updateDriver(data.driver_id, {
        current_location: {
          lat: data.lat,
          lng: data.lng
        }
      });

      logger.info('Driver location updated:', data.driver_id);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update driver location');
      setError(error);
      logger.error('Failed to update driver location:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
    updateDriverAvailability,
    updateDriverLocation,
    isLoading,
    error
  };
}
