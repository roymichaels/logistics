import { logger } from './logger';

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

const DEFAULT_STORES: StoreConfig[] = [
  {
    name: 'users',
    keyPath: 'id',
    indexes: [
      { name: 'wallet_address', keyPath: 'wallet_address', unique: true },
      { name: 'username', keyPath: 'username', unique: true },
      { name: 'role', keyPath: 'role' }
    ]
  },
  {
    name: 'businesses',
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'created_at', keyPath: 'created_at' }
    ]
  },
  {
    name: 'business_memberships',
    keyPath: 'id',
    indexes: [
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'business_id', keyPath: 'business_id' },
      { name: 'user_business', keyPath: ['user_id', 'business_id'], unique: true }
    ]
  },
  {
    name: 'products',
    keyPath: 'id',
    indexes: [
      { name: 'business_id', keyPath: 'business_id' },
      { name: 'category', keyPath: 'category' },
      { name: 'sku', keyPath: 'sku', unique: true }
    ]
  },
  {
    name: 'orders',
    keyPath: 'id',
    indexes: [
      { name: 'business_id', keyPath: 'business_id' },
      { name: 'customer_id', keyPath: 'customer_id' },
      { name: 'status', keyPath: 'status' },
      { name: 'created_at', keyPath: 'created_at' },
      { name: 'assigned_driver', keyPath: 'assigned_driver' }
    ]
  },
  {
    name: 'order_items',
    keyPath: 'id',
    indexes: [
      { name: 'order_id', keyPath: 'order_id' },
      { name: 'product_id', keyPath: 'product_id' }
    ]
  },
  {
    name: 'inventory',
    keyPath: 'id',
    indexes: [
      { name: 'business_id', keyPath: 'business_id' },
      { name: 'product_id', keyPath: 'product_id' },
      { name: 'location_id', keyPath: 'location_id' }
    ]
  },
  {
    name: 'driver_profiles',
    keyPath: 'id',
    indexes: [
      { name: 'user_id', keyPath: 'user_id', unique: true },
      { name: 'status', keyPath: 'status' }
    ]
  },
  {
    name: 'driver_zones',
    keyPath: 'id',
    indexes: [
      { name: 'driver_id', keyPath: 'driver_id' },
      { name: 'zone_id', keyPath: 'zone_id' },
      { name: 'active', keyPath: 'active' }
    ]
  },
  {
    name: 'driver_inventory',
    keyPath: 'id',
    indexes: [
      { name: 'driver_id', keyPath: 'driver_id' },
      { name: 'product_id', keyPath: 'product_id' },
      { name: 'driver_product', keyPath: ['driver_id', 'product_id'] }
    ]
  },
  {
    name: 'zones',
    keyPath: 'id',
    indexes: [
      { name: 'business_id', keyPath: 'business_id' },
      { name: 'active', keyPath: 'active' }
    ]
  },
  {
    name: 'posts',
    keyPath: 'id',
    indexes: [
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'business_id', keyPath: 'business_id' },
      { name: 'created_at', keyPath: 'created_at' },
      { name: 'visibility', keyPath: 'visibility' }
    ]
  },
  {
    name: 'post_media',
    keyPath: 'id',
    indexes: [{ name: 'post_id', keyPath: 'post_id' }]
  },
  {
    name: 'post_likes',
    keyPath: 'id',
    indexes: [
      { name: 'post_id', keyPath: 'post_id' },
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'post_user', keyPath: ['post_id', 'user_id'], unique: true }
    ]
  },
  {
    name: 'post_comments',
    keyPath: 'id',
    indexes: [
      { name: 'post_id', keyPath: 'post_id' },
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'parent_comment_id', keyPath: 'parent_comment_id' }
    ]
  },
  {
    name: 'user_follows',
    keyPath: 'id',
    indexes: [
      { name: 'follower_id', keyPath: 'follower_id' },
      { name: 'following_id', keyPath: 'following_id' },
      { name: 'follower_following', keyPath: ['follower_id', 'following_id'], unique: true }
    ]
  },
  {
    name: 'shopping_carts',
    keyPath: 'id',
    indexes: [
      { name: 'user_id', keyPath: 'user_id' },
      { name: 'business_id', keyPath: 'business_id' }
    ]
  },
  {
    name: 'cart_items',
    keyPath: 'id',
    indexes: [
      { name: 'cart_id', keyPath: 'cart_id' },
      { name: 'product_id', keyPath: 'product_id' }
    ]
  }
];

export class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private readonly config: IndexedDBConfig;

  constructor(config?: Partial<IndexedDBConfig>) {
    this.config = {
      dbName: config?.dbName || 'multi-role-logistics',
      version: config?.version || 1,
      stores: config?.stores || DEFAULT_STORES
    };
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        logger.error('[IndexedDB] Failed to open database', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info(`[IndexedDB] Database ${this.config.dbName} opened successfully`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        logger.info(`[IndexedDB] Upgrading database to version ${this.config.version}`);

        this.config.stores.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const objectStore = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement
            });

            storeConfig.indexes?.forEach((indexConfig) => {
              objectStore.createIndex(indexConfig.name, indexConfig.keyPath, {
                unique: indexConfig.unique,
                multiEntry: indexConfig.multiEntry
              });
            });

            logger.info(`[IndexedDB] Created object store: ${storeConfig.name}`);
          }
        });
      };
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async query<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey | IDBKeyRange
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T>(storeName: string, value: T): Promise<IDBValidKey> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async batchPut<T>(storeName: string, values: T[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      values.forEach((value) => {
        store.put(value);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('[IndexedDB] Database closed');
    }
  }
}

let globalDB: IndexedDBStore | null = null;

export async function getIndexedDB(): Promise<IndexedDBStore> {
  if (!globalDB) {
    globalDB = new IndexedDBStore();
    await globalDB.init();
  }
  return globalDB;
}

export async function clearAllData(): Promise<void> {
  const db = await getIndexedDB();
  const stores = DEFAULT_STORES.map(s => s.name);

  for (const store of stores) {
    await db.clear(store);
  }

  logger.info('[IndexedDB] All data cleared');
}

logger.info('[IndexedDB] IndexedDB store module loaded');
