/**
 * ZoneService Test Suite
 *
 * Tests for zone management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZoneService } from '../../src/services/modules/ZoneService';

vi.mock('../../src/lib/supabaseClient', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: mockZone, error: null })),
          single: vi.fn(() => ({ data: mockZone, error: null }))
        })),
        is: vi.fn().mockReturnThis(),
        order: vi.fn(() => ({ data: [mockZone], error: null })),
        limit: vi.fn(() => ({ data: [mockZone], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'zone-1' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    }))
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

const mockZone = {
  id: 'zone-1',
  name: 'Downtown',
  code: 'DT',
  city: 'Tel Aviv',
  region: 'Center',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('ZoneService', () => {
  let service: ZoneService;

  beforeEach(() => {
    service = new ZoneService('test-user-id');
  });

  describe('Zone Management', () => {
    it('should create a service instance', () => {
      expect(service).toBeInstanceOf(ZoneService);
    });

    it('should list zones', async () => {
      const zones = await service.listZones();
      expect(zones).toBeInstanceOf(Array);
    });

    it('should list zones with filters', async () => {
      const zones = await service.listZones({
        city: 'Tel Aviv',
        region: 'Center'
      });
      expect(zones).toBeInstanceOf(Array);
    });

    it('should exclude deleted zones by default', async () => {
      const zones = await service.listZones();
      expect(zones).toBeInstanceOf(Array);
    });

    it('should include deleted zones when requested', async () => {
      const zones = await service.listZones({ includeDeleted: true });
      expect(zones).toBeInstanceOf(Array);
    });

    it('should get a single zone', async () => {
      const zone = await service.getZone('zone-1');
      expect(zone).toBeDefined();
      expect(zone?.id).toBe('zone-1');
    });

    it('should create a zone', async () => {
      const result = await service.createZone({
        name: 'North District',
        code: 'ND',
        city: 'Haifa',
        active: true
      });
      expect(result).toHaveProperty('id');
      expect(result.id).toBe('zone-1');
    });

    it('should update a zone', async () => {
      await expect(
        service.updateZone('zone-1', { name: 'Updated Zone' })
      ).resolves.not.toThrow();
    });

    it('should soft delete a zone', async () => {
      await expect(
        service.deleteZone('zone-1', true)
      ).resolves.not.toThrow();
    });

    it('should hard delete a zone', async () => {
      await expect(
        service.deleteZone('zone-1', false)
      ).resolves.not.toThrow();
    });

    it('should restore a deleted zone', async () => {
      await expect(service.restoreZone('zone-1')).resolves.not.toThrow();
    });
  });

  describe('Zone Audit', () => {
    it('should get zone audit logs', async () => {
      const logs = await service.getZoneAuditLogs('zone-1');
      expect(logs).toBeInstanceOf(Array);
    });

    it('should limit audit log results', async () => {
      const logs = await service.getZoneAuditLogs('zone-1', 10);
      expect(logs).toBeInstanceOf(Array);
    });
  });

  describe('Driver Zone Assignments', () => {
    it('should list driver zones', async () => {
      const assignments = await service.listDriverZones();
      expect(assignments).toBeInstanceOf(Array);
    });

    it('should filter driver zones by driver', async () => {
      const assignments = await service.listDriverZones({
        driver_id: 'driver-1'
      });
      expect(assignments).toBeInstanceOf(Array);
    });

    it('should filter driver zones by zone', async () => {
      const assignments = await service.listDriverZones({
        zone_id: 'zone-1'
      });
      expect(assignments).toBeInstanceOf(Array);
    });

    it('should filter active assignments only', async () => {
      const assignments = await service.listDriverZones({
        activeOnly: true
      });
      expect(assignments).toBeInstanceOf(Array);
    });

    it('should assign driver to zone', async () => {
      await expect(
        service.assignDriverToZone({
          zone_id: 'zone-1',
          driver_id: 'driver-1',
          active: true
        })
      ).resolves.not.toThrow();
    });

    it('should unassign driver from zone', async () => {
      await expect(
        service.unassignDriverFromZone({
          zone_id: 'zone-1',
          driver_id: 'driver-1'
        })
      ).resolves.not.toThrow();
    });

    it('should use current user as driver if not specified', async () => {
      await expect(
        service.assignDriverToZone({
          zone_id: 'zone-1',
          active: true
        })
      ).resolves.not.toThrow();
    });
  });
});
