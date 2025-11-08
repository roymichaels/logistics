import { Task, Order } from '../data/types';
import { offlineStore } from './offlineStore';
import { logger } from '../lib/logger';

class CacheService {
  private readonly CACHE_PREFIX = 'logistics_app_';
  private readonly CACHE_VERSION = '1.0';

  private getKey(key: string): string {
    return `${this.CACHE_PREFIX}${this.CACHE_VERSION}_${key}`;
  }

  async getTasks(): Promise<Task[]> {
    try {
      return await offlineStore.getCollection<Task>('tasks');
    } catch (error) {
      logger.warn('Failed to load cached tasks:', error);
      return [];
    }
  }

  async setTasks(tasks: Task[]): Promise<void> {
    try {
      await offlineStore.setCollection('tasks', tasks);
    } catch (error) {
      logger.warn('Failed to cache tasks:', error);
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      return await offlineStore.getCollection<Order>('orders');
    } catch (error) {
      logger.warn('Failed to load cached orders:', error);
      return [];
    }
  }

  async setOrders(orders: Order[]): Promise<void> {
    try {
      await offlineStore.setCollection('orders', orders);
    } catch (error) {
      logger.warn('Failed to cache orders:', error);
    }
  }

  clear(): void {
    try {
      void offlineStore.clearCollections(['tasks', 'orders']);
    } catch (error) {
      logger.warn('Failed to clear cache:', error);
    }
  }
}

export const cache = new CacheService();