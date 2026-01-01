import { useState, useCallback } from 'react';
import { useAppServices } from '../../../context/AppServicesContext';
import { logger } from '../../../lib/logger';
import type { DriverInventoryEntry } from '../types';

interface SyncResult {
  success: boolean;
  updated: number;
  removed: number;
  error?: Error;
}

export function useDriverInventory() {
  const { dataStore } = useAppServices();
  const [syncing, setSyncing] = useState(false);

  const syncInventory = useCallback(async (
    entries: DriverInventoryEntry[],
    note?: string
  ): Promise<SyncResult> => {
    if (!dataStore?.syncDriverInventory) {
      return {
        success: false,
        updated: 0,
        removed: 0,
        error: new Error('syncDriverInventory not available'),
      };
    }

    setSyncing(true);
    try {
      const result = await dataStore.syncDriverInventory({
        entries,
        note: note || 'Driver inventory update',
      });

      logger.info('[useDriverInventory] Sync successful', result);

      return {
        success: true,
        updated: result.updated || 0,
        removed: result.removed || 0,
      };
    } catch (error) {
      logger.error('[useDriverInventory] Sync failed', error);
      return {
        success: false,
        updated: 0,
        removed: 0,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    } finally {
      setSyncing(false);
    }
  }, [dataStore]);

  return {
    syncInventory,
    syncing,
  };
}
