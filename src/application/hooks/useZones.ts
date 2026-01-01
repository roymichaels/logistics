import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { Zone } from '@domain/zones/entities';
import { logger } from '@lib/logger';

export interface UseZonesOptions {
  businessId?: string;
  active?: boolean;
  autoLoad?: boolean;
}

export interface UseZonesResult {
  zones: Zone[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createZone: (data: Partial<Zone>) => Promise<Zone | null>;
  updateZone: (id: string, data: Partial<Zone>) => Promise<boolean>;
  deleteZone: (id: string) => Promise<boolean>;
  activateZone: (id: string) => Promise<boolean>;
  deactivateZone: (id: string) => Promise<boolean>;
  getZone: (id: string) => Promise<Zone | null>;
}

export function useZones(options: UseZonesOptions = {}): UseZonesResult {
  const { businessId, active, autoLoad = true } = options;
  const { dataStore } = useServices();

  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    if (!dataStore?.listZones) {
      setError('Zones service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (businessId) filters.businessId = businessId;
      if (active !== undefined) filters.active = active;

      const result = await dataStore.listZones(filters);
      setZones(result || []);
    } catch (err) {
      logger.error('Failed to load zones', err);
      setError(err instanceof Error ? err.message : 'Failed to load zones');
    } finally {
      setLoading(false);
    }
  }, [dataStore, businessId, active]);

  const createZone = useCallback(async (data: Partial<Zone>) => {
    if (!dataStore?.createZone) {
      setError('Create zone service not available');
      return null;
    }

    try {
      const newZone = await dataStore.createZone(data as any);
      if (newZone) {
        setZones(prev => [...prev, newZone]);
      }
      return newZone;
    } catch (err) {
      logger.error('Failed to create zone', err);
      setError(err instanceof Error ? err.message : 'Failed to create zone');
      return null;
    }
  }, [dataStore]);

  const updateZone = useCallback(async (id: string, data: Partial<Zone>) => {
    if (!dataStore?.updateZone) {
      setError('Update zone service not available');
      return false;
    }

    try {
      await dataStore.updateZone(id, data);
      setZones(prev => prev.map(zone =>
        zone.id === id ? { ...zone, ...data } : zone
      ));
      return true;
    } catch (err) {
      logger.error('Failed to update zone', err);
      setError(err instanceof Error ? err.message : 'Failed to update zone');
      return false;
    }
  }, [dataStore]);

  const deleteZone = useCallback(async (id: string) => {
    if (!dataStore?.deleteZone) {
      setError('Delete zone service not available');
      return false;
    }

    try {
      await dataStore.deleteZone(id);
      setZones(prev => prev.filter(zone => zone.id !== id));
      return true;
    } catch (err) {
      logger.error('Failed to delete zone', err);
      setError(err instanceof Error ? err.message : 'Failed to delete zone');
      return false;
    }
  }, [dataStore]);

  const activateZone = useCallback(async (id: string) => {
    return updateZone(id, { active: true });
  }, [updateZone]);

  const deactivateZone = useCallback(async (id: string) => {
    return updateZone(id, { active: false });
  }, [updateZone]);

  const getZone = useCallback(async (id: string) => {
    if (!dataStore?.getZone) {
      setError('Get zone service not available');
      return null;
    }

    try {
      return await dataStore.getZone(id);
    } catch (err) {
      logger.error('Failed to get zone', err);
      setError(err instanceof Error ? err.message : 'Failed to get zone');
      return null;
    }
  }, [dataStore]);

  useEffect(() => {
    if (autoLoad) {
      loadZones();
    }
  }, [autoLoad, loadZones]);

  return {
    zones,
    loading,
    error,
    refresh: loadZones,
    createZone,
    updateZone,
    deleteZone,
    activateZone,
    deactivateZone,
    getZone,
  };
}
