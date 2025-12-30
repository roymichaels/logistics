import { unifiedDataStore } from '../storage/UnifiedDataStore';
import { syncEngine } from '../storage/SyncEngine';
import { logger } from '../logger';
import type { Order, CreateOrderInput } from '../../data/types';

export class OfflineOrderService {
  private static instance: OfflineOrderService;

  private constructor() {}

  static getInstance(): OfflineOrderService {
    if (!OfflineOrderService.instance) {
      OfflineOrderService.instance = new OfflineOrderService();
    }
    return OfflineOrderService.instance;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const order = await unifiedDataStore.get<Order>('orders', orderId);
      return order || null;
    } catch (error) {
      logger.error('Failed to get order', error as Error, { orderId });
      return null;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const orders = await unifiedDataStore.getAll<Order>('orders');
      return orders.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      logger.error('Failed to get all orders', error as Error);
      return [];
    }
  }

  async createOrder(input: CreateOrderInput): Promise<Order | null> {
    try {
      const newOrder: Order = {
        id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        created_at: new Date().toISOString(),
        status: 'pending',
        ...input
      } as Order;

      await unifiedDataStore.set('orders', newOrder.id, newOrder);
      syncEngine.trackChange('orders', newOrder.id, 'create', newOrder);

      logger.info('Created order offline', { orderId: newOrder.id });
      return newOrder;
    } catch (error) {
      logger.error('Failed to create order', error as Error);
      return null;
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order | null> {
    try {
      const existing = await this.getOrder(orderId);
      if (!existing) {
        logger.warn('Order not found for update', { orderId });
        return null;
      }

      const updated = { ...existing, status, updated_at: new Date().toISOString() };
      await unifiedDataStore.set('orders', orderId, updated);
      syncEngine.trackChange('orders', orderId, 'update', updated);

      logger.info('Updated order status offline', { orderId, status });
      return updated;
    } catch (error) {
      logger.error('Failed to update order status', error as Error, { orderId });
      return null;
    }
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    try {
      const allOrders = await this.getAllOrders();
      return allOrders.filter(order => order.status === status);
    } catch (error) {
      logger.error('Failed to get orders by status', error as Error, { status });
      return [];
    }
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    try {
      const allOrders = await this.getAllOrders();
      return allOrders.filter(order => order.customer_id === userId);
    } catch (error) {
      logger.error('Failed to get orders by user', error as Error, { userId });
      return [];
    }
  }

  async getPendingSync(): Promise<Order[]> {
    try {
      const pendingChanges = await syncEngine.getPendingChanges();
      const orderChanges = pendingChanges.filter(change => change.collection === 'orders');

      const orders = await Promise.all(
        orderChanges.map(change => this.getOrder(change.documentId))
      );

      return orders.filter((o): o is Order => o !== null);
    } catch (error) {
      logger.error('Failed to get orders pending sync', error as Error);
      return [];
    }
  }
}

export const offlineOrderService = OfflineOrderService.getInstance();
