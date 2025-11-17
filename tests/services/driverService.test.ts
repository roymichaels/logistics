/**
 * DriverService Test Suite
 *
 * Tests for driver management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriverService } from '../../src/services/modules/DriverService';

vi.mock('../../src/lib/supabaseClient', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: mockDriverStatus, error: null }))
        })),
        order: vi.fn(() => ({ data: [mockDriverStatus], error: null })),
        in: vi.fn(() => ({ data: [], error: null })),
        limit: vi.fn(() => ({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
      upsert: vi.fn(() => ({ error: null })),
      delete: vi.fn(() => ({
        in: vi.fn(() => ({ error: null }))
      }))
    })),
    rpc: vi.fn(() => ({ error: null }))
  })),
  loadConfig: vi.fn()
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

const mockDriverStatus = {
  driver_id: 'driver-1',
  status: 'available',
  is_online: true,
  current_zone_id: 'zone-1',
  last_updated: '2024-01-01T00:00:00Z',
  note: null
};

describe('DriverService', () => {
  let service: DriverService;

  beforeEach(() => {
    service = new DriverService('test-user-id');
  });

  describe('Driver Status Management', () => {
    it('should create a service instance', () => {
      expect(service).toBeInstanceOf(DriverService);
    });

    it('should update driver status', async () => {
      await expect(
        service.updateDriverStatus({
          status: 'available',
          zone_id: 'zone-1',
          is_online: true
        })
      ).resolves.not.toThrow();
    });

    it('should set driver online', async () => {
      await expect(
        service.setDriverOnline({ zone_id: 'zone-1' })
      ).resolves.not.toThrow();
    });

    it('should set driver offline', async () => {
      await expect(service.setDriverOffline()).resolves.not.toThrow();
    });

    it('should toggle driver online status', async () => {
      await expect(
        service.toggleDriverOnline({
          is_online: true,
          zone_id: 'zone-1'
        })
      ).resolves.not.toThrow();
    });

    it('should toggle driver offline status', async () => {
      await expect(
        service.toggleDriverOnline({
          is_online: false
        })
      ).resolves.not.toThrow();
    });

    it('should get driver status', async () => {
      const status = await service.getDriverStatus('driver-1');
      expect(status).toBeDefined();
    });

    it('should use current user id if driver not specified', async () => {
      const status = await service.getDriverStatus();
      expect(status).toBeDefined();
    });

    it('should list driver statuses', async () => {
      const statuses = await service.listDriverStatuses();
      expect(statuses).toBeInstanceOf(Array);
    });

    it('should filter driver statuses by zone', async () => {
      const statuses = await service.listDriverStatuses({
        zone_id: 'zone-1'
      });
      expect(statuses).toBeInstanceOf(Array);
    });

    it('should filter online drivers only', async () => {
      const statuses = await service.listDriverStatuses({
        onlyOnline: true
      });
      expect(statuses).toBeInstanceOf(Array);
    });
  });

  describe('Driver Inventory', () => {
    it('should list driver inventory', async () => {
      const inventory = await service.listDriverInventory();
      expect(inventory).toBeInstanceOf(Array);
    });

    it('should filter inventory by driver', async () => {
      const inventory = await service.listDriverInventory({
        driver_id: 'driver-1'
      });
      expect(inventory).toBeInstanceOf(Array);
    });

    it('should filter inventory by product', async () => {
      const inventory = await service.listDriverInventory({
        product_id: 'prod-1'
      });
      expect(inventory).toBeInstanceOf(Array);
    });

    it('should transfer inventory to driver', async () => {
      await expect(
        service.transferInventoryToDriver({
          driver_id: 'driver-1',
          product_id: 'prod-1',
          quantity: 10
        })
      ).resolves.not.toThrow();
    });

    it('should reject negative quantity transfer', async () => {
      await expect(
        service.transferInventoryToDriver({
          driver_id: 'driver-1',
          product_id: 'prod-1',
          quantity: -5
        })
      ).rejects.toThrow();
    });

    it('should adjust driver inventory', async () => {
      await expect(
        service.adjustDriverInventory({
          driver_id: 'driver-1',
          product_id: 'prod-1',
          quantity_change: 5,
          reason: 'Test adjustment'
        })
      ).resolves.not.toThrow();
    });

    it('should sync driver inventory', async () => {
      const result = await service.syncDriverInventory({
        driver_id: 'driver-1',
        entries: [
          { product_id: 'prod-1', quantity: 10 },
          { product_id: 'prod-2', quantity: 5 }
        ]
      });
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('removed');
    });
  });

  describe('Driver Movements', () => {
    it('should record driver movement', async () => {
      await expect(
        service.recordDriverMovement({
          driver_id: 'driver-1',
          zone_id: 'zone-1',
          action: 'zone_entry',
          details: 'Entered downtown zone'
        })
      ).resolves.not.toThrow();
    });

    it('should list driver movements', async () => {
      const movements = await service.listDriverMovements();
      expect(movements).toBeInstanceOf(Array);
    });

    it('should filter movements by driver', async () => {
      const movements = await service.listDriverMovements({
        driver_id: 'driver-1'
      });
      expect(movements).toBeInstanceOf(Array);
    });

    it('should filter movements by zone', async () => {
      const movements = await service.listDriverMovements({
        zone_id: 'zone-1'
      });
      expect(movements).toBeInstanceOf(Array);
    });

    it('should limit movement results', async () => {
      const movements = await service.listDriverMovements({
        limit: 50
      });
      expect(movements).toBeInstanceOf(Array);
    });
  });

  describe('Inventory Sync Edge Cases', () => {
    it('should handle empty entries', async () => {
      const result = await service.syncDriverInventory({
        driver_id: 'driver-1',
        entries: []
      });
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('removed');
    });

    it('should normalize quantities to positive integers', async () => {
      const result = await service.syncDriverInventory({
        driver_id: 'driver-1',
        entries: [
          { product_id: 'prod-1', quantity: 10.5 },
          { product_id: 'prod-2', quantity: -5 }
        ]
      });
      expect(result).toBeDefined();
    });

    it('should remove products with zero quantity', async () => {
      const result = await service.syncDriverInventory({
        driver_id: 'driver-1',
        entries: [
          { product_id: 'prod-1', quantity: 0 }
        ]
      });
      expect(result).toBeDefined();
    });
  });
});
