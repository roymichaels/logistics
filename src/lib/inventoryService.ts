import { logger } from './logger';
import { DataStore } from '../data/types';

/**
 * STUB: This is a temporary stub for the legacy InventoryService
 * The actual inventory logic is now in the modular system: src/modules/inventory/
 * This stub exists only to prevent build errors in files that haven't been migrated yet.
 */
export class InventoryService {
  constructor(private readonly dataStore: DataStore) {
    logger.warn('[InventoryService] Using legacy stub - migrate to modular inventory system');
  }

  async getDriverAvailability(...args: any[]): Promise<any[]> {
    logger.warn('[InventoryService] getDriverAvailability stub called');
    return [];
  }

  async getProductBalance(...args: any[]): Promise<any> {
    logger.warn('[InventoryService] getProductBalance stub called');
    return { available: 0, reserved: 0, total: 0 };
  }

  async transferBetweenLocations(...args: any[]): Promise<void> {
    logger.warn('[InventoryService] transferBetweenLocations stub called');
  }

  async transferToDriver(...args: any[]): Promise<void> {
    logger.warn('[InventoryService] transferToDriver stub called');
  }

  async adjustDriverInventory(...args: any[]): Promise<void> {
    logger.warn('[InventoryService] adjustDriverInventory stub called');
  }

  async requestRestock(...args: any[]): Promise<any> {
    logger.warn('[InventoryService] requestRestock stub called');
    return { id: 'stub', status: 'pending' };
  }

  async approveRestock(...args: any[]): Promise<void> {
    logger.warn('[InventoryService] approveRestock stub called');
  }

  async fulfillRestock(...args: any[]): Promise<void> {
    logger.warn('[InventoryService] fulfillRestock stub called');
  }

  async getRestockQueue(...args: any[]): Promise<any[]> {
    logger.warn('[InventoryService] getRestockQueue stub called');
    return [];
  }

  async recordSale(...args: any[]): Promise<void> {
    logger.warn('[InventoryService] recordSale stub called');
  }

  async getDriverInventory(...args: any[]): Promise<any[]> {
    logger.warn('[InventoryService] getDriverInventory stub called');
    return [];
  }
}
