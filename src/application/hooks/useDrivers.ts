import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { Driver, DriverStatus } from '@domain/drivers/entities';
import { logger } from '@lib/logger';

export interface UseDriversOptions {
  status?: DriverStatus;
  zoneId?: string;
  available?: boolean;
  autoLoad?: boolean;
}

export interface UseDriversResult {
  drivers: Driver[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDriver: (data: Partial<Driver>) => Promise<Driver | null>;
  updateDriver: (id: string, data: Partial<Driver>) => Promise<boolean>;
  deleteDriver: (id: string) => Promise<boolean>;
  updateDriverStatus: (id: string, status: DriverStatus) => Promise<boolean>;
  assignOrder: (driverId: string, orderId: string) => Promise<boolean>;
  getDriver: (id: string) => Promise<Driver | null>;
}

export function useDrivers(options: UseDriversOptions = {}): UseDriversResult {
  const { status, zoneId, available, autoLoad = true } = options;
  const { dataStore } = useServices();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    if (!dataStore?.listDrivers) {
      setError('Drivers service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (status) filters.status = status;
      if (zoneId) filters.zoneId = zoneId;
      if (available !== undefined) filters.available = available;

      const result = await dataStore.listDrivers(filters);
      setDrivers(result || []);
    } catch (err) {
      logger.error('Failed to load drivers', err);
      setError(err instanceof Error ? err.message : 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, [dataStore, status, zoneId, available]);

  const createDriver = useCallback(async (data: Partial<Driver>) => {
    if (!dataStore?.createDriver) {
      setError('Create driver service not available');
      return null;
    }

    try {
      const newDriver = await dataStore.createDriver(data as any);
      if (newDriver) {
        setDrivers(prev => [...prev, newDriver]);
      }
      return newDriver;
    } catch (err) {
      logger.error('Failed to create driver', err);
      setError(err instanceof Error ? err.message : 'Failed to create driver');
      return null;
    }
  }, [dataStore]);

  const updateDriver = useCallback(async (id: string, data: Partial<Driver>) => {
    if (!dataStore?.updateDriver) {
      setError('Update driver service not available');
      return false;
    }

    try {
      await dataStore.updateDriver(id, data);
      setDrivers(prev => prev.map(driver =>
        driver.id === id ? { ...driver, ...data } : driver
      ));
      return true;
    } catch (err) {
      logger.error('Failed to update driver', err);
      setError(err instanceof Error ? err.message : 'Failed to update driver');
      return false;
    }
  }, [dataStore]);

  const deleteDriver = useCallback(async (id: string) => {
    if (!dataStore?.deleteDriver) {
      setError('Delete driver service not available');
      return false;
    }

    try {
      await dataStore.deleteDriver(id);
      setDrivers(prev => prev.filter(driver => driver.id !== id));
      return true;
    } catch (err) {
      logger.error('Failed to delete driver', err);
      setError(err instanceof Error ? err.message : 'Failed to delete driver');
      return false;
    }
  }, [dataStore]);

  const updateDriverStatus = useCallback(async (id: string, newStatus: DriverStatus) => {
    return updateDriver(id, { status: newStatus });
  }, [updateDriver]);

  const assignOrder = useCallback(async (driverId: string, orderId: string) => {
    if (!dataStore?.assignOrderToDriver) {
      setError('Assign order service not available');
      return false;
    }

    try {
      await dataStore.assignOrderToDriver(orderId, driverId);
      return true;
    } catch (err) {
      logger.error('Failed to assign order to driver', err);
      setError(err instanceof Error ? err.message : 'Failed to assign order');
      return false;
    }
  }, [dataStore]);

  const getDriver = useCallback(async (id: string) => {
    if (!dataStore?.getDriver) {
      setError('Get driver service not available');
      return null;
    }

    try {
      return await dataStore.getDriver(id);
    } catch (err) {
      logger.error('Failed to get driver', err);
      setError(err instanceof Error ? err.message : 'Failed to get driver');
      return null;
    }
  }, [dataStore]);

  useEffect(() => {
    if (autoLoad) {
      loadDrivers();
    }
  }, [autoLoad, loadDrivers]);

  return {
    drivers,
    loading,
    error,
    refresh: loadDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
    assignOrder,
    getDriver,
  };
}
