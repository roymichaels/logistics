import { logger } from './logger';
import {
  DataStore,
  Order,
  ZoneCoverageSnapshot,
  DriverStatusRecord,
  DispatchAssignmentResult
} from '../data/types';
import { DispatchService, DriverCandidate } from './dispatchService';

export interface ZoneCoverageResult {
  coverage: ZoneCoverageSnapshot[];
  unassignedDrivers: DriverStatusRecord[];
  outstandingOrders: Order[];
}

export class DispatchOrchestrator {
  private readonly dispatchService: DispatchService;

  constructor(private readonly dataStore: DataStore, dispatchService?: DispatchService) {
    this.dispatchService = dispatchService ?? new DispatchService(dataStore);
  }

  async getCoverage(zoneId?: string): Promise<ZoneCoverageResult> {
    const coverage = this.dataStore.getZoneCoverage
      ? await this.dataStore.getZoneCoverage({ zone_id: zoneId, includeOrders: true })
      : await this.buildCoverageFallback(zoneId);

    const onlineStatuses = this.dataStore.listDriverStatuses
      ? await this.dataStore.listDriverStatuses({ zone_id: zoneId, onlyOnline: true })
      : [];

    const coverageDriverIds = new Set(
      coverage.flatMap((snapshot) => snapshot.onlineDrivers.map((status) => status.driver_id))
    );

    const unassignedDrivers = onlineStatuses.filter((status) => !status.current_zone_id);

    let outstandingOrders = this.collectOutstandingOrders(coverage);

    if (outstandingOrders.length === 0) {
      outstandingOrders = await this.filterOutstandingOrders(zoneId, coverageDriverIds);
    }

    return {
      coverage,
      unassignedDrivers,
      outstandingOrders
    };
  }

  async getDriverCandidates(order: Order, zoneId?: string): Promise<DriverCandidate[]> {
    return this.dispatchService.getEligibleDrivers({ zoneId, items: order.items });
  }

  async assignOrder(
    order: Order,
    zoneId?: string | null,
    options?: { notify?: boolean; note?: string }
  ): Promise<DispatchAssignmentResult> {
    const candidates = await this.getDriverCandidates(order, zoneId || undefined);

    if (candidates.length === 0) {
      return { success: false, reason: zoneId ? 'no_candidates' : 'no_zone' };
    }

    const bestCandidate = candidates[0];
    await this.dispatchService.assignOrder(order, bestCandidate.driverId, zoneId || undefined);

    let notificationId: string | undefined;

    if (options?.notify !== false && this.dataStore.createNotification) {
      try {
        const notification = await this.dataStore.createNotification({
          recipient_id: bestCandidate.driverId,
          title: 'הוקצתה הזמנה חדשה',
          message: options?.note
            ? `${options.note} (#${order.id})`
            : `הזמנה חדשה (#${order.id}) הוקצתה אליך`,
          type: 'info',
          action_url: `/orders/${order.id}`
        });
        notificationId = notification.id;
      } catch (error) {
        logger.warn('Failed to create dispatch notification', error);
      }
    }

    return {
      success: true,
      driverId: bestCandidate.driverId,
      zoneId: zoneId ?? null,
      candidateScore: bestCandidate.score,
      notificationId
    };
  }

  private async buildCoverageFallback(zoneId?: string): Promise<ZoneCoverageSnapshot[]> {
    if (!this.dataStore.listZones) {
      return [];
    }

    const zones = await this.dataStore.listZones();
    const filteredZones = zones.filter((zone) => (!zoneId ? true : zone.id === zoneId));

    const statuses = this.dataStore.listDriverStatuses
      ? await this.dataStore.listDriverStatuses({ zone_id: zoneId, onlyOnline: true })
      : [];

    const assignments = this.dataStore.listDriverZones
      ? await this.dataStore.listDriverZones({ zone_id: zoneId, activeOnly: true })
      : [];

    const driverIds = Array.from(new Set(statuses.map((status) => status.driver_id)));
    const inventory = this.dataStore.listDriverInventory
      ? await this.dataStore.listDriverInventory({ driver_ids: driverIds })
      : [];

    const outstandingOrders = await this.filterOutstandingOrders(
      zoneId,
      new Set(driverIds)
    );

    return filteredZones.map((zone) => {
      const zoneStatuses = statuses.filter((status) => status.current_zone_id === zone.id);
      const zoneAssignments = assignments.filter((assignment) => assignment.zone_id === zone.id);
      const zoneDriverIds = new Set(zoneStatuses.map((status) => status.driver_id));
      const zoneInventory = inventory.filter((record) => zoneDriverIds.has(record.driver_id));
      const zoneOrders = outstandingOrders.filter((order) =>
        order.assigned_driver ? zoneDriverIds.has(order.assigned_driver) : false
      );
      const idleDrivers = zoneStatuses.filter((status) => status.status === 'available');

      return {
        zone,
        onlineDrivers: zoneStatuses,
        idleDrivers,
        assignments: zoneAssignments,
        inventory: zoneInventory,
        outstandingOrders: zoneOrders
      };
    });
  }

  private async filterOutstandingOrders(zoneId: string | undefined, zoneDriverIds: Set<string>): Promise<Order[]> {
    if (!this.dataStore.listOrders) {
      return [];
    }

    try {
      const orders = await this.dataStore.listOrders();
      return orders.filter((order) => {
        if (!['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(order.status)) {
          return false;
        }
        if (!order.assigned_driver) {
          return zoneId ? false : true;
        }
        return zoneDriverIds.has(order.assigned_driver);
      });
    } catch (error) {
      logger.warn('Failed to load orders for coverage snapshot', error);
      return [];
    }
  }

  private collectOutstandingOrders(coverage: ZoneCoverageSnapshot[]): Order[] {
    const seen = new Set<string>();
    const orders: Order[] = [];

    coverage.forEach((snapshot) => {
      snapshot.outstandingOrders.forEach((order) => {
        if (!seen.has(order.id)) {
          seen.add(order.id);
          orders.push(order);
        }
      });
    });

    return orders;
  }
}
