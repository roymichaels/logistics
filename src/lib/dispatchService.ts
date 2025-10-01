import {
  DataStore,
  DriverInventoryRecord,
  DriverZoneAssignment,
  DriverStatusRecord,
  Order,
  DriverMovementAction
} from '../../data/types';

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
  constructor(private dataStore: DataStore) {}

  async getEligibleDrivers(params: DispatchEligibilityParams): Promise<DriverCandidate[]> {
    if (!this.dataStore.listDriverStatuses) {
      throw new Error('Data store does not support driver status queries');
    }

    const statuses = await this.dataStore.listDriverStatuses({
      zone_id: params.zoneId,
      onlyOnline: true
    });

    if (statuses.length === 0) {
      return [];
    }

    const driverIds = statuses.map(status => status.driver_id);

    const [assignments, inventory] = await Promise.all([
      this.dataStore.listDriverZones?.({
        zone_id: params.zoneId,
        activeOnly: true
      }) ?? Promise.resolve([]),
      this.dataStore.listDriverInventory?.({ driver_ids: driverIds }) ?? Promise.resolve([])
    ]);

    const inventoryByDriver = new Map<string, DriverInventoryRecord[]>();
    inventory.forEach(record => {
      const existing = inventoryByDriver.get(record.driver_id) || [];
      existing.push(record);
      inventoryByDriver.set(record.driver_id, existing);
    });

    const assignmentByDriver = new Map<string, DriverZoneAssignment[]>();
    assignments.forEach(assignment => {
      const existing = assignmentByDriver.get(assignment.driver_id) || [];
      existing.push(assignment);
      assignmentByDriver.set(assignment.driver_id, existing);
    });

    const candidates: DriverCandidate[] = statuses.map(status => {
      const driverInventory = inventoryByDriver.get(status.driver_id) || [];
      const driverAssignments = assignmentByDriver.get(status.driver_id) || [];
      const totalInventory = driverInventory.reduce((sum, record) => sum + (record.quantity || 0), 0);
      const isZonePreferred = params.zoneId
        ? driverAssignments.some(assignment => assignment.zone_id === params.zoneId && assignment.active)
        : true;

      const missingItems = (params.items || []).map(item => {
        const balance = driverInventory.find(record => record.product_id === item.product_id)?.quantity ?? 0;
        return {
          product_id: item.product_id,
          missing: Math.max(0, (item.quantity || 0) - balance)
        };
      });

      const matches = missingItems.every(item => item.missing === 0);
      const totalMissing = missingItems.reduce((sum, item) => sum + item.missing, 0);
      const statusWeight = status.status === 'available' ? 25 : status.status === 'on_break' ? 10 : 0;
      const zoneWeight = isZonePreferred ? 50 : 10;
      const inventoryWeight = Math.min(totalInventory, 40);
      const fulfillmentWeight = matches ? 100 : Math.max(0, 80 - totalMissing * 20);
      const score = zoneWeight + inventoryWeight + statusWeight + fulfillmentWeight;

      return {
        driverId: status.driver_id,
        status,
        zones: driverAssignments,
        inventory: driverInventory,
        missingItems,
        matches,
        totalInventory,
        score
      };
    });

    return candidates
      .filter(candidate => candidate.matches)
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
