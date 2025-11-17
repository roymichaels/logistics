/**
 * InventoryService Test Suite
 *
 * Tests for inventory management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from '../../src/services/modules/InventoryService';

vi.mock('../../src/lib/supabaseClient', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockProduct, error: null })),
          maybeSingle: vi.fn(() => ({ data: mockProduct, error: null }))
        })),
        order: vi.fn(() => ({ data: [mockProduct], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'prod-1' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
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

const mockProduct = {
  id: 'prod-1',
  name: 'Test Product',
  category: 'electronics',
  price: 100,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService('test-user-id');
  });

  describe('Product Management', () => {
    it('should create a service instance', () => {
      expect(service).toBeInstanceOf(InventoryService);
    });

    it('should list products', async () => {
      const products = await service.listProducts();
      expect(products).toBeInstanceOf(Array);
    });

    it('should list products with filters', async () => {
      const products = await service.listProducts({ category: 'electronics' });
      expect(products).toBeInstanceOf(Array);
    });

    it('should get a single product', async () => {
      const product = await service.getProduct('prod-1');
      expect(product).toBeDefined();
      expect(product.id).toBe('prod-1');
    });

    it('should create a product', async () => {
      const result = await service.createProduct({
        name: 'New Product',
        category: 'electronics',
        price: 150,
        business_id: 'biz-1'
      });
      expect(result).toHaveProperty('id');
      expect(result.id).toBe('prod-1');
    });

    it('should update a product', async () => {
      await expect(
        service.updateProduct('prod-1', { name: 'Updated Product' })
      ).resolves.not.toThrow();
    });
  });

  describe('Inventory Operations', () => {
    it('should list inventory records', async () => {
      const inventory = await service.listInventory();
      expect(inventory).toBeInstanceOf(Array);
    });

    it('should list inventory with filters', async () => {
      const inventory = await service.listInventory({
        location_id: 'loc-1',
        product_id: 'prod-1'
      });
      expect(inventory).toBeInstanceOf(Array);
    });

    it('should list inventory locations', async () => {
      const locations = await service.listInventoryLocations();
      expect(locations).toBeInstanceOf(Array);
    });
  });

  describe('Restock Requests', () => {
    it('should list restock requests', async () => {
      const requests = await service.listRestockRequests();
      expect(requests).toBeInstanceOf(Array);
    });

    it('should submit a restock request', async () => {
      const result = await service.submitRestockRequest({
        product_id: 'prod-1',
        requested_quantity: 50,
        to_location_id: 'loc-1'
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('Sales Logging', () => {
    it('should list sales logs', async () => {
      const logs = await service.listSalesLogs();
      expect(logs).toBeInstanceOf(Array);
    });

    it('should record a sale', async () => {
      const result = await service.recordSale({
        product_id: 'prod-1',
        location_id: 'loc-1',
        quantity: 5,
        total_amount: 500
      });
      expect(result).toHaveProperty('id');
    });

    it('should reject sale with zero quantity', async () => {
      await expect(
        service.recordSale({
          product_id: 'prod-1',
          location_id: 'loc-1',
          quantity: 0,
          total_amount: 0
        })
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing supabase client', () => {
      vi.mock('../../src/lib/supabaseClient', () => ({
        getSupabase: vi.fn(() => null)
      }));

      expect(() => new InventoryService('test-user')).toThrow();
    });
  });
});
