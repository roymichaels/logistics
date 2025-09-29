import { Task, Order } from '../data/types';

class CacheService {
  private readonly CACHE_PREFIX = 'logistics_app_';
  private readonly CACHE_VERSION = '1.0';

  private getKey(key: string): string {
    return `${this.CACHE_PREFIX}${this.CACHE_VERSION}_${key}`;
  }

  async getTasks(): Promise<Task[]> {
    try {
      const cached = localStorage.getItem(this.getKey('tasks'));
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Failed to load cached tasks:', error);
      return [];
    }
  }

  async setTasks(tasks: Task[]): Promise<void> {
    try {
      localStorage.setItem(this.getKey('tasks'), JSON.stringify(tasks));
    } catch (error) {
      console.warn('Failed to cache tasks:', error);
    }
  }

  async getOrders(): Promise<Order[]> {
    try {
      const cached = localStorage.getItem(this.getKey('orders'));
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.warn('Failed to load cached orders:', error);
      return [];
    }
  }

  async setOrders(orders: Order[]): Promise<void> {
    try {
      localStorage.setItem(this.getKey('orders'), JSON.stringify(orders));
    } catch (error) {
      console.warn('Failed to cache orders:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}

export const cache = new CacheService();