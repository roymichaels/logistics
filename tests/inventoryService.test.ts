import { describe, expect, it, vi } from 'vitest';
import type { DataStore, DriverInventoryRecord, DriverStatusRecord, DriverZoneAssignment, OrderItemInput, RestockRequest } from '../src/data/types';
import { InventoryService } from '../src/lib/inventoryService';

describe('InventoryService', () => {
  const createService = (overrides: Partial<DataStore> = {}) => {
    const baseStore: Partial<DataStore> = {
      getProfile: vi.fn().mockResolvedValue({ telegram_id: 'me', role: 'manager' } as any),
      getRolePermissions: vi.fn().mockResolvedValue({ can_approve_restock: true, can_fulfill_restock: false } as any),
      listRestockRequests: vi.fn().mockResolvedValue([]),
      listDriverStatuses: vi.fn().mockResolvedValue([]),
      listDriverZones: vi.fn().mockResolvedValue([]),
      listDriverInventory: vi.fn().mockResolvedValue([]),
      transferInventory: vi.fn(),
      transferInventoryToDriver: vi.fn(),
      approveRestockRequest: vi.fn(),
    };

    return new InventoryService({ ...baseStore, ...overrides } as DataStore);
  };

  it('delegates transfer requests to the underlying data store', async () => {
    const transferInventory = vi.fn();
    const transferInventoryToDriver = vi.fn();
    const service = createService({ transferInventory, transferInventoryToDriver });

    const locationTransfer = { product_id: 'p1', from_location_id: 'loc-a', to_location_id: 'loc-b', quantity: 3 } as any;
    await service.transferBetweenLocations(locationTransfer);
    expect(transferInventory).toHaveBeenCalledWith(locationTransfer);

    const driverTransfer = { product_id: 'p2', from_location_id: 'loc-b', driver_id: 'driver-1', quantity: 4 } as any;
    await service.transferToDriver(driverTransfer);
    expect(transferInventoryToDriver).toHaveBeenCalledWith(driverTransfer);
  });

  it('approves restock requests via the data store', async () => {
    const approveRestockRequest = vi.fn();
    const service = createService({ approveRestockRequest });

    await service.approveRestock('req-1', { approved_by: 'me', approved_quantity: 5 } as any);
    expect(approveRestockRequest).toHaveBeenCalledWith('req-1', { approved_by: 'me', approved_quantity: 5 });
  });

  it('builds restock queue entries with ownership and permission flags', async () => {
    const requests: RestockRequest[] = [
      { id: '1', product_id: 'p1', requested_quantity: 1, requested_by: 'me', status: 'pending', requested_at: '2024-01-01' } as any,
      { id: '2', product_id: 'p2', requested_quantity: 2, requested_by: 'other', status: 'pending', requested_at: '2024-01-01' } as any,
    ];

    const dataStore: Partial<DataStore> = {
      getProfile: vi.fn().mockResolvedValue({ telegram_id: 'me' } as any),
      getRolePermissions: vi.fn().mockResolvedValue({ can_approve_restock: true, can_fulfill_restock: true } as any),
      listRestockRequests: vi.fn().mockResolvedValue(requests),
    };

    const service = createService(dataStore);
    const queue = await service.getRestockQueue();

    expect(queue).toEqual([
      expect.objectContaining({ request: requests[0], isMine: true, canApprove: true, canFulfill: true }),
      expect.objectContaining({ request: requests[1], isMine: false, canApprove: true, canFulfill: true }),
    ]);
    expect(dataStore.listRestockRequests).toHaveBeenCalled();
  });

  it('scores driver availability using inventory, assignments and status', async () => {
    const items: OrderItemInput[] = [{ product_id: 'p1', quantity: 2 }];

    const statuses: DriverStatusRecord[] = [
      { driver_id: 'driver-1', status: 'available', is_online: true, current_zone_id: 'zone-1', last_updated: '' } as any,
      { driver_id: 'driver-2', status: 'on_break', is_online: true, current_zone_id: 'zone-1', last_updated: '' } as any,
    ];

    const zones: DriverZoneAssignment[] = [
      { id: 'a', driver_id: 'driver-1', zone_id: 'zone-1', active: true, assigned_at: '' } as any,
      { id: 'b', driver_id: 'driver-2', zone_id: 'zone-2', active: false, assigned_at: '' } as any,
    ];

    const inventory: DriverInventoryRecord[] = [
      { id: 'inv-1', driver_id: 'driver-1', product_id: 'p1', quantity: 2, updated_at: '' } as any,
      { id: 'inv-2', driver_id: 'driver-2', product_id: 'p1', quantity: 1, updated_at: '' } as any,
    ];

    const dataStore: Partial<DataStore> = {
      listDriverStatuses: vi.fn().mockImplementation(async ({ zone_id }) =>
        statuses.filter((status) => !zone_id || status.current_zone_id === zone_id)
      ),
      listDriverZones: vi.fn().mockImplementation(async ({ zone_id, activeOnly }) =>
        zones.filter(
          (assignment) =>
            (!zone_id || assignment.zone_id === zone_id) && (!activeOnly || assignment.active)
        )
      ),
      listDriverInventory: vi.fn().mockImplementation(async ({ driver_ids }) =>
        inventory.filter((record) => !driver_ids || driver_ids.includes(record.driver_id))
      ),
    };

    const service = createService(dataStore);
    const availability = await service.getDriverAvailability(items, { zoneId: 'zone-1' });

    expect(availability).toHaveLength(2);

    const [first, second] = availability;
    expect(first.driver.driver_id).toBe('driver-1');
    expect(first.matches).toBe(true);
    expect(first.missing_items).toEqual([{ product_id: 'p1', missing: 0 }]);
    expect(first.score).toBe(177);

    expect(second.driver.driver_id).toBe('driver-2');
    expect(second.matches).toBe(false);
    expect(second.missing_items).toEqual([{ product_id: 'p1', missing: 1 }]);
    expect(second.score).toBe(81);
  });
});
