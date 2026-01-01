import { logger } from './logger';
import { DataStore } from '../data/types';

/**
 * STUB: This is a temporary stub for the legacy DispatchOrchestrator
 * This stub exists only to prevent build errors in files that haven't been migrated yet.
 */

export interface ZoneCoverageResult {
  zoneId: string;
  zoneName: string;
  driversAvailable: number;
  driversOnline: number;
  pendingOrders: number;
  coverage: number;
}

export class DispatchOrchestrator {
  constructor(private readonly dataStore: DataStore) {
    logger.warn('[DispatchOrchestrator] Using legacy stub');
  }

  async getZoneCoverage(): Promise<ZoneCoverageResult[]> {
    logger.warn('[DispatchOrchestrator] getZoneCoverage stub called');
    return [];
  }

  async assignOrderToDriver(orderId: string, driverId: string): Promise<void> {
    logger.warn('[DispatchOrchestrator] assignOrderToDriver stub called');
    if (!this.dataStore.updateOrder) {
      throw new Error('Update order not available');
    }
    await this.dataStore.updateOrder(orderId, { assigned_driver: driverId });
  }

  async getEligibleDrivers(...args: any[]): Promise<any[]> {
    logger.warn('[DispatchOrchestrator] getEligibleDrivers stub called');
    return [];
  }

  async reassignOrder(orderId: string, newDriverId: string): Promise<void> {
    logger.warn('[DispatchOrchestrator] reassignOrder stub called');
    await this.assignOrderToDriver(orderId, newDriverId);
  }
}
