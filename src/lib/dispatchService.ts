import {
  DataStore,
  DriverInventoryRecord,
  DriverZoneAssignment,
  DriverStatusRecord,
  Order,
  DriverMovementAction
} from '../data/types';
import { InventoryService } from './inventoryService';

export interface DriverCandidate {
  driverId: string;
  status: DriverStatusRecord;
  zones: DriverZoneAssignment[];
  inventory: DriverInventoryRecord[];
  missingItems: { product_id: string; missing: number }[];
  matches: boolean;
  totalInventory: number;
  score: number;
}

export interface DispatchEligibilityParams {
  zoneId?: string;
  items: Order['items'];
}

export class DispatchService {
  private readonly inventoryService: InventoryService;

  constructor(private dataStore: DataStore, inventoryService?: InventoryService) {
    this.inventoryService = inventoryService ?? new InventoryService(dataStore);
  }

  async getEligibleDrivers(params: DispatchEligibilityParams): Promise<DriverCandidate[]> {
    const availability = await this.inventoryService.getDriverAvailability(params.items, {
      zoneId: params.zoneId,
      onlyOnline: true
    });

    return availability
      .filter(candidate => candidate.matches)
      .map(candidate => ({
        driverId: candidate.driver.driver_id,
        status: candidate.driver,
        zones: candidate.zones,
        inventory: candidate.inventory,
        missingItems: candidate.missing_items,
        matches: candidate.matches,
        totalInventory: candidate.total_inventory,
        score: candidate.score
      }))
      .sort((a, b) => b.score - a.score);
  }

  async assignOrder(order: Order, driverId: string, zoneId?: string): Promise<void> {
    if (!this.dataStore.updateOrder) {
      throw new Error('Data store does not support updating orders');
    }

    await this.dataStore.updateOrder(order.id, {
      status: 'assigned',
      assigned_driver: driverId
    });

    if (this.dataStore.updateDriverStatus) {
      await this.dataStore.updateDriverStatus({
        driver_id: driverId,
        status: 'delivering',
        zone_id: typeof zoneId === 'undefined' ? undefined : zoneId,
        note: `הזמנה ${order.id} הוקצתה`
      });
    }

    if (this.dataStore.logDriverMovement) {
      await this.dataStore.logDriverMovement({
        driver_id: driverId,
        zone_id: zoneId,
        action: 'order_assigned' as DriverMovementAction,
        details: `הזמנה ${order.id} הוקצתה לנהג`
      });
    }
  }
}
