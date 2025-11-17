/**
 * OrderService Test Suite
 *
 * Tests for order management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService } from '../../src/services/modules/OrderService';

vi.mock('../../src/lib/supabaseClient', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockOrder, error: null }))
        })),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn(() => ({ data: [mockOrder], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'order-1' }, error: null }))
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

const mockOrder = {
  id: 'order-1',
  customer_name: 'John Doe',
  customer_phone: '050-1234567',
  customer_address: 'Tel Aviv',
  status: 'new',
  items: [{ product_id: 'prod-1', quantity: 2, price: 100 }],
  total_amount: 200,
  entry_mode: 'manual',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService('test-user-id');
  });

  describe('Order Management', () => {
    it('should create a service instance', () => {
      expect(service).toBeInstanceOf(OrderService);
    });

    it('should list orders', async () => {
      const orders = await service.listOrders();
      expect(orders).toBeInstanceOf(Array);
    });

    it('should list orders with status filter', async () => {
      const orders = await service.listOrders({ status: 'new' });
      expect(orders).toBeInstanceOf(Array);
    });

    it('should list orders with search query', async () => {
      const orders = await service.listOrders({ q: 'John' });
      expect(orders).toBeInstanceOf(Array);
    });

    it('should list orders with date range', async () => {
      const orders = await service.listOrders({
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      });
      expect(orders).toBeInstanceOf(Array);
    });

    it('should get a single order', async () => {
      const order = await service.getOrder('order-1');
      expect(order).toBeDefined();
      expect(order.id).toBe('order-1');
    });

    it('should create an order', async () => {
      const result = await service.createOrder({
        customer_name: 'Jane Doe',
        customer_phone: '050-9876543',
        customer_address: 'Jerusalem',
        items: [{ product_id: 'prod-1', quantity: 1, price: 100 }],
        entry_mode: 'manual'
      });
      expect(result).toHaveProperty('id');
      expect(result.id).toBe('order-1');
    });

    it('should reject order without items', async () => {
      await expect(
        service.createOrder({
          customer_name: 'Jane Doe',
          customer_phone: '050-9876543',
          customer_address: 'Jerusalem',
          items: [],
          entry_mode: 'manual'
        })
      ).rejects.toThrow('Order must include at least one item');
    });

    it('should update an order', async () => {
      await expect(
        service.updateOrder('order-1', { status: 'processing' })
      ).resolves.not.toThrow();
    });

    it('should delete an order', async () => {
      await expect(service.deleteOrder('order-1')).resolves.not.toThrow();
    });
  });

  describe('Driver Assignment', () => {
    it('should assign driver to order', async () => {
      await expect(
        service.assignDriverToOrder('order-1', 'driver-1')
      ).resolves.not.toThrow();
    });

    it('should update order status', async () => {
      await expect(
        service.updateOrderStatus('order-1', 'delivered')
      ).resolves.not.toThrow();
    });
  });

  describe('Advanced Filtering', () => {
    it('should filter by amount range', async () => {
      const orders = await service.listOrders({
        minAmount: 100,
        maxAmount: 500
      });
      expect(orders).toBeInstanceOf(Array);
    });

    it('should filter by assigned driver', async () => {
      const orders = await service.listOrders({
        assignedDriver: 'driver-1'
      });
      expect(orders).toBeInstanceOf(Array);
    });

    it('should sort orders', async () => {
      const orders = await service.listOrders({
        sortBy: 'total_amount',
        sortOrder: 'desc'
      });
      expect(orders).toBeInstanceOf(Array);
    });
  });
});
