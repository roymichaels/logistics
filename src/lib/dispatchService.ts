import { logger } from './logger';
import { DataStore, Order } from '../data/types';

/**
 * STUB: This is a temporary stub for the legacy DispatchService
 * This stub exists only to prevent build errors in files that haven't been migrated yet.
 */

export interface DriverCandidate {
  driverId: string;
  status: any;
  zones: any[];
  inventory: any[];
  missingItems: any[];
  matches: boolean;
  totalInventory: number;
  score: number;
}

export interface DispatchEligibilityParams {
  zoneId?: string;
  items: Order['items'];
}

export class DispatchService {
  constructor(private dataStore: DataStore) {
    logger.warn('[DispatchService] Using legacy stub');
  }

  async getEligibleDrivers(params: DispatchEligibilityParams): Promise<DriverCandidate[]> {
    logger.warn('[DispatchService] getEligibleDrivers stub called');
    return [];
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<void> {
    logger.warn('[DispatchService] assignOrderToDriver stub called');
    if (!this.dataStore.updateOrder) {
      throw new Error('Update order not available');
    }
    await this.dataStore.updateOrder(orderId, { assigned_driver: driverId });
  }
}
