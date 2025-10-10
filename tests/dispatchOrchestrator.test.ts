import { describe, expect, it, vi } from 'vitest';
import type { DataStore, DriverInventoryRecord, DriverStatusRecord, DriverZoneAssignment, Order } from '../src/data/types';
import { DispatchOrchestrator } from '../src/lib/dispatchOrchestrator';

const createOrder = (): Order => ({
  id: 'order-1',
  status: 'confirmed',
  created_at: '',
  updated_at: '',
  items: [{ product_id: 'p1', quantity: 2 }],
} as any);

describe('DispatchOrchestrator.assignOrder', () => {
  const buildDataStore = ({
    statuses,
    assignments,
    inventory,
  }: {
    statuses: DriverStatusRecord[];
    assignments: DriverZoneAssignment[];
    inventory: DriverInventoryRecord[];
  }): DataStore => ({
    getProfile: vi.fn() as any,
    listDriverStatuses: vi.fn().mockImplementation(async ({ zone_id }) =>
      statuses.filter((status) => !zone_id || status.current_zone_id === zone_id)
    ),
    listDriverZones: vi.fn().mockImplementation(async ({ zone_id, activeOnly }) =>
      assignments.filter(
        (assignment) =>
          (!zone_id || assignment.zone_id === zone_id) && (!activeOnly || assignment.active)
      )
    ),
    listDriverInventory: vi.fn().mockImplementation(async ({ driver_ids }) =>
      inventory.filter((record) => !driver_ids || driver_ids.includes(record.driver_id))
    ),
    updateOrder: vi.fn().mockResolvedValue(undefined),
    updateDriverStatus: vi.fn().mockResolvedValue(undefined),
    logDriverMovement: vi.fn().mockResolvedValue(undefined),
    createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
  } as unknown as DataStore);

  it('assigns the highest scoring driver candidate and notifies them', async () => {
    const statuses: DriverStatusRecord[] = [
      { driver_id: 'driver-1', status: 'available', is_online: true, current_zone_id: 'zone-1', last_updated: '' } as any,
      { driver_id: 'driver-2', status: 'available', is_online: true, current_zone_id: 'zone-1', last_updated: '' } as any,
    ];
    const assignments: DriverZoneAssignment[] = [
      { id: 'a', driver_id: 'driver-1', zone_id: 'zone-1', active: true, assigned_at: '' } as any,
    ];
    const inventory: DriverInventoryRecord[] = [
      { id: 'inv-1', driver_id: 'driver-1', product_id: 'p1', quantity: 3, updated_at: '' } as any,
      { id: 'inv-2', driver_id: 'driver-2', product_id: 'p1', quantity: 1, updated_at: '' } as any,
    ];

    const dataStore = buildDataStore({ statuses, assignments, inventory });
    const orchestrator = new DispatchOrchestrator(dataStore);

    const order = createOrder();
    const result = await orchestrator.assignOrder(order, 'zone-1', { note: 'Handle quickly' });

    expect(result.success).toBe(true);
    expect(result.driverId).toBe('driver-1');
    expect(result.candidateScore).toBe(178);
    expect(result.notificationId).toBe('notif-1');

    expect(dataStore.updateOrder).toHaveBeenCalledWith('order-1', {
      status: 'assigned',
      assigned_driver: 'driver-1',
    });
    expect(dataStore.updateDriverStatus).toHaveBeenCalledWith({
      driver_id: 'driver-1',
      status: 'delivering',
      zone_id: 'zone-1',
      note: expect.stringContaining('order-1'),
    });
    expect(dataStore.logDriverMovement).toHaveBeenCalledWith({
      driver_id: 'driver-1',
      zone_id: 'zone-1',
      action: 'order_assigned',
      details: expect.stringContaining('order-1'),
    });
    expect(dataStore.createNotification).toHaveBeenCalledWith({
      recipient_id: 'driver-1',
      title: expect.any(String),
      message: expect.stringContaining('Handle quickly'),
      type: 'info',
      action_url: '/orders/order-1',
    });
  });

  it('returns a failure result when no suitable drivers are available', async () => {
    const emptyStore = buildDataStore({ statuses: [], assignments: [], inventory: [] });
    const orchestrator = new DispatchOrchestrator(emptyStore);
    const order = createOrder();

    const result = await orchestrator.assignOrder(order, 'zone-1');

    expect(result).toEqual({ success: false, reason: 'no_candidates' });
    expect(emptyStore.updateOrder).not.toHaveBeenCalled();
  });
});
