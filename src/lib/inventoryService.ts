import { logger } from './logger';
import {
  DataStore,
  InventoryBalanceSummary,
  InventoryTransferInput,
  DriverInventoryTransferInput,
  DriverInventoryAdjustmentInput,
  RestockRequestInput,
  RestockApprovalInput,
  RestockFulfillmentInput,
  RestockRequest,
  SalesLogInput,
  DriverAvailabilitySummary,
  OrderItemInput,
  DriverZoneAssignment,
  DriverInventoryRecord,
  DriverStatusRecord
} from '../data/types';
import { offlineStore } from '../utils/offlineStore';

export interface RestockQueueEntry {
  request: RestockRequest;
  isMine: boolean;
  canApprove: boolean;
  canFulfill: boolean;
}

export class InventoryService {
  constructor(private readonly dataStore: DataStore) {}

  private ensureMethod<K extends keyof DataStore>(method: K): void {
    if (typeof this.dataStore[method] !== 'function') {
      throw new Error(`Data store does not implement ${String(method)}`);
    }
  }

  async getProductBalance(productId: string): Promise<InventoryBalanceSummary> {
    this.ensureMethod('getInventorySummary');
    return this.dataStore.getInventorySummary!(productId);
  }

  async transferBetweenLocations(input: InventoryTransferInput): Promise<void> {
    this.ensureMethod('transferInventory');
    await this.dataStore.transferInventory!(input);
  }

  async transferToDriver(input: DriverInventoryTransferInput): Promise<void> {
    this.ensureMethod('transferInventoryToDriver');
    await this.dataStore.transferInventoryToDriver!(input);
  }

  async adjustDriverInventory(input: DriverInventoryAdjustmentInput): Promise<void> {
    this.ensureMethod('adjustDriverInventory');
    await this.dataStore.adjustDriverInventory!(input);
  }

  async logSale(input: SalesLogInput): Promise<{ id: string }> {
    this.ensureMethod('recordSale');
    return this.dataStore.recordSale!(input);
  }

  async submitRestock(input: RestockRequestInput): Promise<{ id: string }> {
    this.ensureMethod('submitRestockRequest');
    try {
      return await this.dataStore.submitRestockRequest!(input);
    } catch (error) {
      if (offlineStore.isOfflineError(error)) {
        const queued = await offlineStore.queueMutation('submitRestock', { input }, {
          meta: {
            summary: `בקשת חידוש ל-${input.product_id} (${input.requested_quantity})`,
            entityType: 'restock',
            entityId: input.product_id
          }
        });
        logger.warn('Restock request queued for offline retry', queued);
        return { id: queued.id };
      }

      throw error;
    }
  }

  async approveRestock(id: string, input: RestockApprovalInput): Promise<void> {
    this.ensureMethod('approveRestockRequest');
    await this.dataStore.approveRestockRequest!(id, input);
  }

  async fulfillRestock(id: string, input: RestockFulfillmentInput): Promise<void> {
    this.ensureMethod('fulfillRestockRequest');
    await this.dataStore.fulfillRestockRequest!(id, input);
  }

  async rejectRestock(id: string, notes?: string): Promise<void> {
    this.ensureMethod('rejectRestockRequest');
    await this.dataStore.rejectRestockRequest!(id, notes ? { notes } : undefined);
  }

  async getRestockQueue(filters?: { product_id?: string; location_id?: string; onlyMine?: boolean }): Promise<RestockQueueEntry[]> {
    this.ensureMethod('listRestockRequests');

    const [requests, profile] = await Promise.all([
      this.dataStore.listRestockRequests!(filters),
      this.dataStore.getProfile()
    ]);

    const permissions = this.dataStore.getRolePermissions ? await this.dataStore.getRolePermissions() : undefined;

    return requests.map(request => ({
      request,
      isMine: request.requested_by === profile.telegram_id,
      canApprove: Boolean(permissions?.can_approve_restock),
      canFulfill: Boolean(permissions?.can_fulfill_restock)
    }));
  }

  async getDriverAvailability(
    items: OrderItemInput[],
    options?: { zoneId?: string; onlyOnline?: boolean }
  ): Promise<DriverAvailabilitySummary[]> {
    if (!this.dataStore.listDriverStatuses) {
      throw new Error('Data store does not support driver availability queries');
    }

    const statuses = await this.dataStore.listDriverStatuses({
      zone_id: options?.zoneId,
      onlyOnline: options?.onlyOnline !== false
    });

    if (statuses.length === 0) {
      return [];
    }

    const driverIds = statuses.map(status => status.driver_id);

    const [assignments, inventory] = await Promise.all([
      this.fetchDriverAssignments(options?.zoneId, driverIds),
      this.fetchDriverInventory(driverIds)
    ]);

    const inventoryByDriver = this.groupByDriver(inventory);
    const assignmentsByDriver = this.groupAssignmentsByDriver(assignments);

    return statuses.map(status => this.buildDriverAvailability(status, assignmentsByDriver, inventoryByDriver, items));
  }

  private async fetchDriverAssignments(zoneId: string | undefined, driverIds: string[]): Promise<DriverZoneAssignment[]> {
    if (!this.dataStore.listDriverZones) {
      return [];
    }

    return this.dataStore.listDriverZones!({
      zone_id: zoneId,
      driver_id: undefined,
      activeOnly: true
    }).then(rows => rows.filter(row => driverIds.includes(row.driver_id)));
  }

  private async fetchDriverInventory(driverIds: string[]): Promise<DriverInventoryRecord[]> {
    if (!this.dataStore.listDriverInventory) {
      return [];
    }

    return this.dataStore.listDriverInventory!({ driver_ids: driverIds });
  }

  private groupByDriver(records: DriverInventoryRecord[]): Map<string, DriverInventoryRecord[]> {
    return records.reduce((map, record) => {
      const existing = map.get(record.driver_id) || [];
      existing.push(record);
      map.set(record.driver_id, existing);
      return map;
    }, new Map<string, DriverInventoryRecord[]>());
  }

  private groupAssignmentsByDriver(assignments: DriverZoneAssignment[]): Map<string, DriverZoneAssignment[]> {
    return assignments.reduce((map, assignment) => {
      const existing = map.get(assignment.driver_id) || [];
      existing.push(assignment);
      map.set(assignment.driver_id, existing);
      return map;
    }, new Map<string, DriverZoneAssignment[]>());
  }

  private buildDriverAvailability(
    status: DriverStatusRecord,
    assignments: Map<string, DriverZoneAssignment[]>,
    inventory: Map<string, DriverInventoryRecord[]>,
    items: OrderItemInput[]
  ): DriverAvailabilitySummary {
    const driverInventory = inventory.get(status.driver_id) || [];
    const driverAssignments = assignments.get(status.driver_id) || [];
    const totalInventory = driverInventory.reduce((sum, record) => sum + (record.quantity || 0), 0);

    const missing_items = (items || []).map(item => {
      const balance = driverInventory.find(record => record.product_id === item.product_id)?.quantity ?? 0;
      return {
        product_id: item.product_id,
        missing: Math.max(0, (item.quantity || 0) - balance)
      };
    });

    const matches = missing_items.every(item => item.missing === 0);
    const totalMissing = missing_items.reduce((sum, item) => sum + item.missing, 0);
    const statusWeight = status.status === 'available' ? 25 : status.status === 'on_break' ? 10 : 0;
    const zoneWeight = driverAssignments.some(assignment => assignment.active) ? 50 : 10;
    const inventoryWeight = Math.min(totalInventory, 40);
    const fulfillmentWeight = matches ? 100 : Math.max(0, 80 - totalMissing * 20);

    return {
      driver: status,
      zones: driverAssignments,
      inventory: driverInventory,
      total_inventory: totalInventory,
      missing_items,
      matches,
      score: zoneWeight + inventoryWeight + statusWeight + fulfillmentWeight
    };
  }
}
