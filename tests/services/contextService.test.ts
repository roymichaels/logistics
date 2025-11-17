/**
 * ContextService Test Suite
 *
 * Tests for infrastructure and business context switching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextService } from '../../src/services/modules/ContextService';

vi.mock('../../src/lib/supabaseClient', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: mockContext, error: null })),
          single: vi.fn(() => ({ data: mockContext, error: null }))
        })),
        order: vi.fn(() => ({ data: [mockInfrastructure], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'ctx-1' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      }))
    })),
    rpc: vi.fn(() => ({ data: mockContext, error: null }))
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

const mockContext = {
  user_id: 'user-1',
  infrastructure_id: 'infra-1',
  business_id: 'biz-1',
  context_version: 1,
  last_switched_at: '2024-01-01T00:00:00Z',
  session_metadata: {}
};

const mockInfrastructure = {
  id: 'infra-1',
  code: 'DEFAULT',
  slug: 'default',
  display_name: 'Default Infrastructure',
  description: 'Default infrastructure',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockBusiness = {
  id: 'biz-1',
  name: 'Test Business',
  infrastructure_id: 'infra-1',
  type_id: 'type-1',
  active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('ContextService', () => {
  let service: ContextService;

  beforeEach(() => {
    service = new ContextService('test-user-id');
  });

  describe('Context Management', () => {
    it('should create a service instance', () => {
      expect(service).toBeInstanceOf(ContextService);
    });

    it('should get active context', async () => {
      const context = await service.getActiveContext();
      expect(context).toBeDefined();
      expect(context?.user_id).toBe('user-1');
    });

    it('should switch context', async () => {
      const result = await service.switchContext({
        infrastructure_id: 'infra-1',
        business_id: 'biz-1'
      });
      expect(result).toBeDefined();
    });

    it('should switch to business', async () => {
      const result = await service.switchToBusiness('biz-1');
      expect(result).toBeDefined();
    });

    it('should switch to infrastructure only', async () => {
      const result = await service.switchToInfrastructure('infra-1');
      expect(result).toBeDefined();
    });

    it('should initialize context if not exists', async () => {
      const result = await service.initializeContext();
      expect(result).toBeDefined();
    });
  });

  describe('Infrastructure Operations', () => {
    it('should list infrastructures', async () => {
      const infrastructures = await service.listInfrastructures();
      expect(infrastructures).toBeInstanceOf(Array);
    });

    it('should get single infrastructure', async () => {
      const infrastructure = await service.getInfrastructure('infra-1');
      expect(infrastructure).toBeDefined();
    });
  });

  describe('Business Operations', () => {
    it('should list businesses by infrastructure', async () => {
      const businesses = await service.listBusinessesByInfrastructure('infra-1');
      expect(businesses).toBeInstanceOf(Array);
    });

    it('should get single business', async () => {
      const business = await service.getBusiness('biz-1');
      expect(business).toBeDefined();
    });

    it('should get user businesses', async () => {
      const businesses = await service.getUserBusinesses();
      expect(businesses).toBeInstanceOf(Array);
    });

    it('should get user role in business', async () => {
      const role = await service.getUserRoleInBusiness('biz-1');
      expect(role).toBeDefined();
    });

    it('should check business access', async () => {
      const hasAccess = await service.hasBusinessAccess('biz-1');
      expect(typeof hasAccess).toBe('boolean');
    });
  });

  describe('Context Summary', () => {
    it('should get context summary', async () => {
      const summary = await service.getContextSummary();
      expect(summary).toHaveProperty('context');
      expect(summary).toHaveProperty('infrastructure');
      expect(summary).toHaveProperty('business');
    });

    it('should return null values when context not set', async () => {
      const summary = await service.getContextSummary();
      expect(summary).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when switching to non-existent business', async () => {
      await expect(
        service.switchToBusiness('invalid-id')
      ).rejects.toThrow();
    });

    it('should throw error when infrastructure ID missing', async () => {
      await expect(
        service.switchContext({ business_id: 'biz-1' })
      ).rejects.toThrow();
    });
  });

  describe('Session Metadata', () => {
    it('should include session metadata when switching', async () => {
      const metadata = { source: 'test', timestamp: Date.now() };
      const result = await service.switchContext({
        infrastructure_id: 'infra-1',
        session_metadata: metadata
      });
      expect(result).toBeDefined();
    });
  });
});
