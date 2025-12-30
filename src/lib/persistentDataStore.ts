import { IndexedDBStore } from './indexedDBStore';
import { logger } from './logger';

class PersistentDataLayer {
  private idb: IndexedDBStore;
  private initialized = false;

  constructor() {
    this.idb = new IndexedDBStore();
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await this.idb.init();
      this.initialized = true;
      logger.info('[PersistentDataLayer] Initialized with IndexedDB');
    } catch (error) {
      logger.error('[PersistentDataLayer] Init failed:', error);
    }
  }

  async saveUser(walletAddress: string, userData: any): Promise<void> {
    if (!this.initialized) await this.init();
    try {
      await this.idb.set('users', walletAddress, userData);
    } catch (error) {
      logger.error('[PersistentDataLayer] Save user failed:', error);
    }
  }

  async getUser(walletAddress: string): Promise<any | null> {
    if (!this.initialized) await this.init();
    try {
      return await this.idb.get('users', walletAddress);
    } catch (error) {
      logger.error('[PersistentDataLayer] Get user failed:', error);
      return null;
    }
  }

  async saveOrder(orderId: string, orderData: any): Promise<void> {
    if (!this.initialized) await this.init();
    try {
      await this.idb.set('orders', orderId, orderData);
    } catch (error) {
      logger.error('[PersistentDataLayer] Save order failed:', error);
    }
  }

  async getAllOrders(): Promise<any[]> {
    if (!this.initialized) await this.init();
    try {
      return await this.idb.getAll('orders');
    } catch (error) {
      logger.error('[PersistentDataLayer] Get orders failed:', error);
      return [];
    }
  }

  async saveProduct(productId: string, productData: any): Promise<void> {
    if (!this.initialized) await this.init();
    try {
      await this.idb.set('products', productId, productData);
    } catch (error) {
      logger.error('[PersistentDataLayer] Save product failed:', error);
    }
  }

  async getAllProducts(): Promise<any[]> {
    if (!this.initialized) await this.init();
    try {
      return await this.idb.getAll('products');
    } catch (error) {
      logger.error('[PersistentDataLayer] Get products failed:', error);
      return [];
    }
  }

  async saveBusiness(businessId: string, businessData: any): Promise<void> {
    if (!this.initialized) await this.init();
    try {
      await this.idb.set('businesses', businessId, businessData);
    } catch (error) {
      logger.error('[PersistentDataLayer] Save business failed:', error);
    }
  }

  async getAllBusinesses(): Promise<any[]> {
    if (!this.initialized) await this.init();
    try {
      return await this.idb.getAll('businesses');
    } catch (error) {
      logger.error('[PersistentDataLayer] Get businesses failed:', error);
      return [];
    }
  }

  async clearAll(): Promise<void> {
    if (!this.initialized) await this.init();
    try {
      await Promise.all([
        this.idb.clear('users'),
        this.idb.clear('orders'),
        this.idb.clear('products'),
        this.idb.clear('businesses'),
        this.idb.clear('drivers'),
        this.idb.clear('zones')
      ]);
      logger.info('[PersistentDataLayer] Cleared all data');
    } catch (error) {
      logger.error('[PersistentDataLayer] Clear all failed:', error);
    }
  }
}

export const persistentDataLayer = new PersistentDataLayer();
