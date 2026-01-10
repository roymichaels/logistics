import { logger } from '../lib/logger';

/**
 * Offline Outbox Service
 *
 * Implements the outbox pattern for offline-first operations.
 * Per the canonical knowledgebase:
 * - Offline actions → outbox
 * - Online reconnect → sync
 * - Server timestamps win
 * - High-risk actions blocked offline (config, reassignment)
 *
 * This is the LOCAL CACHE + OUTBOX, never authoritative.
 * Supabase Postgres is the source of truth.
 */

export interface OutboxOperation {
  id: string;
  type: 'order_status_update' | 'delivery_complete' | 'proof_upload' | 'location_update' | 'driver_status';
  payload: any;
  createdAt: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

const OUTBOX_STORE_KEY = 'offline_outbox';
const MAX_RETRY_COUNT = 3;

class OfflineOutboxService {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.initIndexedDB();
    this.setupOnlineListener();
  }

  /**
   * Initialize IndexedDB for persistent offline storage
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineOutboxDB', 1);

      request.onerror = () => {
        logger.error('[OfflineOutbox] Failed to open IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('[OfflineOutbox] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('outbox')) {
          const objectStore = db.createObjectStore('outbox', { keyPath: 'id' });
          objectStore.createIndex('status', 'status', { unique: false });
          objectStore.createIndex('createdAt', 'createdAt', { unique: false });
          logger.info('[OfflineOutbox] Created outbox object store');
        }
      };
    });
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      logger.info('[OfflineOutbox] Network connection restored');
      this.isOnline = true;
      this.syncOutbox();
    });

    window.addEventListener('offline', () => {
      logger.info('[OfflineOutbox] Network connection lost');
      this.isOnline = false;
    });
  }

  /**
   * Add an operation to the outbox
   */
  async addOperation(type: OutboxOperation['type'], payload: any): Promise<string> {
    const operation: OutboxOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['outbox'], 'readwrite');
      const objectStore = transaction.objectStore('outbox');
      const request = objectStore.add(operation);

      request.onsuccess = () => {
        logger.info('[OfflineOutbox] Operation added to outbox', { id: operation.id, type });
        resolve(operation.id);

        // Try to sync immediately if online
        if (this.isOnline) {
          this.syncOutbox();
        }
      };

      request.onerror = () => {
        logger.error('[OfflineOutbox] Failed to add operation to outbox', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<OutboxOperation[]> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['outbox'], 'readonly');
      const objectStore = transaction.objectStore('outbox');
      const index = objectStore.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        logger.error('[OfflineOutbox] Failed to get pending operations', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update operation status
   */
  async updateOperation(id: string, updates: Partial<OutboxOperation>): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['outbox'], 'readwrite');
      const objectStore = transaction.objectStore('outbox');
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (!operation) {
          reject(new Error('Operation not found'));
          return;
        }

        const updatedOperation = { ...operation, ...updates };
        const putRequest = objectStore.put(updatedOperation);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          logger.error('[OfflineOutbox] Failed to update operation', putRequest.error);
          reject(putRequest.error);
        };
      };

      getRequest.onerror = () => {
        logger.error('[OfflineOutbox] Failed to get operation', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * Delete an operation from the outbox
   */
  async deleteOperation(id: string): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['outbox'], 'readwrite');
      const objectStore = transaction.objectStore('outbox');
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        logger.info('[OfflineOutbox] Operation deleted', { id });
        resolve();
      };

      request.onerror = () => {
        logger.error('[OfflineOutbox] Failed to delete operation', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Sync all pending operations to the server
   */
  async syncOutbox(): Promise<void> {
    if (!this.isOnline) {
      logger.warn('[OfflineOutbox] Cannot sync: offline');
      return;
    }

    if (this.syncInProgress) {
      logger.info('[OfflineOutbox] Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    logger.info('[OfflineOutbox] Starting sync');

    try {
      const pendingOps = await this.getPendingOperations();
      logger.info('[OfflineOutbox] Found pending operations', { count: pendingOps.length });

      for (const op of pendingOps) {
        try {
          await this.updateOperation(op.id, { status: 'syncing' });
          await this.syncOperation(op);
          await this.deleteOperation(op.id);
          logger.info('[OfflineOutbox] Operation synced successfully', { id: op.id, type: op.type });
        } catch (error) {
          logger.error('[OfflineOutbox] Failed to sync operation', { id: op.id, error });

          const retryCount = op.retryCount + 1;
          if (retryCount >= MAX_RETRY_COUNT) {
            await this.updateOperation(op.id, {
              status: 'failed',
              retryCount,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
            logger.error('[OfflineOutbox] Operation failed after max retries', { id: op.id });
          } else {
            await this.updateOperation(op.id, {
              status: 'pending',
              retryCount,
              lastError: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      logger.info('[OfflineOutbox] Sync completed');
    } catch (error) {
      logger.error('[OfflineOutbox] Sync failed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single operation to the server
   * This method should be customized based on the operation type
   */
  private async syncOperation(operation: OutboxOperation): Promise<void> {
    // This is a placeholder - actual implementation would call the appropriate
    // service methods based on operation.type

    logger.info('[OfflineOutbox] Syncing operation', {
      id: operation.id,
      type: operation.type,
      payload: operation.payload,
    });

    // Example sync logic (to be implemented):
    switch (operation.type) {
      case 'order_status_update':
        // await dataAccessService.updateOrderStatus(operation.payload.orderId, operation.payload.status);
        break;

      case 'delivery_complete':
        // await dataAccessService.completeDelivery(operation.payload.assignmentId, operation.payload.proof);
        break;

      case 'proof_upload':
        // await storageService.uploadProof(operation.payload.file, operation.payload.assignmentId);
        break;

      case 'location_update':
        // await driverService.updateLocation(operation.payload.driverId, operation.payload.location);
        break;

      case 'driver_status':
        // await driverService.updateDriverStatus(operation.payload.driverId, operation.payload.status);
        break;

      default:
        logger.warn('[OfflineOutbox] Unknown operation type', { type: operation.type });
    }

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Get count of pending operations
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingOperations();
    return pending.length;
  }

  /**
   * Check if the service is online
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Clear all operations (use with caution!)
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['outbox'], 'readwrite');
      const objectStore = transaction.objectStore('outbox');
      const request = objectStore.clear();

      request.onsuccess = () => {
        logger.info('[OfflineOutbox] All operations cleared');
        resolve();
      };

      request.onerror = () => {
        logger.error('[OfflineOutbox] Failed to clear operations', request.error);
        reject(request.error);
      };
    });
  }
}

export const offlineOutboxService = new OfflineOutboxService();
