import { IndexedDBStore, getIndexedDB } from '../indexedDBStore';
import { logger } from '../logger';

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'app_') {
    this.prefix = prefix;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      logger.error('[LocalStorage] Error reading key', error as Error, { key });
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      logger.error('[LocalStorage] Error writing key', error as Error, { key });
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(this.prefix))
      .map((key) => key.slice(this.prefix.length));
  }
}

class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return this.storage.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

class IndexedDBAdapter implements StorageAdapter {
  private db: IndexedDBStore | null = null;
  private storeName: string;

  constructor(storeName: string = 'key_value_store') {
    this.storeName = storeName;
  }

  private async ensureDB(): Promise<IndexedDBStore> {
    if (!this.db) {
      this.db = await getIndexedDB();
    }
    return this.db;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.ensureDB();
      const result = await db.get<{ key: string; value: T }>(this.storeName, key);
      return result?.value || null;
    } catch (error) {
      logger.error('[IndexedDBAdapter] Error reading key', error as Error, { key });
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.put(this.storeName, { key, value });
    } catch (error) {
      logger.error('[IndexedDBAdapter] Error writing key', error as Error, { key });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.delete(this.storeName, key);
    } catch (error) {
      logger.error('[IndexedDBAdapter] Error deleting key', error as Error, { key });
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      await db.clear(this.storeName);
    } catch (error) {
      logger.error('[IndexedDBAdapter] Error clearing store', error as Error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      const all = await db.getAll<{ key: string }>(this.storeName);
      return all.map((item) => item.key);
    } catch (error) {
      logger.error('[IndexedDBAdapter] Error listing keys', error as Error);
      return [];
    }
  }
}

export type CacheStrategy = 'memory' | 'localStorage' | 'indexedDB' | 'multi';

export interface UnifiedDataStoreConfig {
  strategy?: CacheStrategy;
  prefix?: string;
  ttl?: number;
}

export class UnifiedDataStore {
  private primaryAdapter: StorageAdapter;
  private memoryCache: MemoryStorageAdapter;
  private strategy: CacheStrategy;
  private ttl: number;

  constructor(config: UnifiedDataStoreConfig = {}) {
    this.strategy = config.strategy || 'multi';
    this.ttl = config.ttl || 3600000;
    this.memoryCache = new MemoryStorageAdapter();

    switch (this.strategy) {
      case 'memory':
        this.primaryAdapter = this.memoryCache;
        break;
      case 'localStorage':
        this.primaryAdapter = new LocalStorageAdapter(config.prefix);
        break;
      case 'indexedDB':
        this.primaryAdapter = new IndexedDBAdapter();
        break;
      case 'multi':
      default:
        this.primaryAdapter = new LocalStorageAdapter(config.prefix);
        break;
    }

    logger.info('[UnifiedDataStore] Initialized with strategy:', this.strategy);
  }

  async get<T>(key: string, options?: { useCache?: boolean }): Promise<T | null> {
    const useCache = options?.useCache !== false;

    if (useCache && this.strategy === 'multi') {
      const cached = await this.memoryCache.get<{ value: T; expires: number }>(key);
      if (cached && cached.expires > Date.now()) {
        logger.debug('[UnifiedDataStore] Cache hit:', key);
        return cached.value;
      }
    }

    const value = await this.primaryAdapter.get<T>(key);

    if (value && useCache && this.strategy === 'multi') {
      await this.memoryCache.set(key, {
        value,
        expires: Date.now() + this.ttl
      });
    }

    return value;
  }

  async set<T>(key: string, value: T, options?: { skipCache?: boolean }): Promise<void> {
    await this.primaryAdapter.set(key, value);

    if (!options?.skipCache && this.strategy === 'multi') {
      await this.memoryCache.set(key, {
        value,
        expires: Date.now() + this.ttl
      });
    }

    logger.debug('[UnifiedDataStore] Set:', key);
  }

  async delete(key: string): Promise<void> {
    await this.primaryAdapter.delete(key);
    if (this.strategy === 'multi') {
      await this.memoryCache.delete(key);
    }
    logger.debug('[UnifiedDataStore] Deleted:', key);
  }

  async clear(): Promise<void> {
    await this.primaryAdapter.clear();
    if (this.strategy === 'multi') {
      await this.memoryCache.clear();
    }
    logger.info('[UnifiedDataStore] Cleared all data');
  }

  async keys(): Promise<string[]> {
    return await this.primaryAdapter.keys();
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      })
    );
    return results;
  }

  async setMultiple<T>(entries: Map<string, T>): Promise<void> {
    await Promise.all(
      Array.from(entries.entries()).map(([key, value]) => this.set(key, value))
    );
  }

  invalidateCache(key: string): void {
    if (this.strategy === 'multi') {
      this.memoryCache.delete(key).catch((error) => {
        logger.error('[UnifiedDataStore] Error invalidating cache', error as Error, { key });
      });
    }
  }

  clearCache(): void {
    if (this.strategy === 'multi') {
      this.memoryCache.clear().catch((error) => {
        logger.error('[UnifiedDataStore] Error clearing cache', error as Error);
      });
    }
  }
}

let globalStore: UnifiedDataStore | null = null;

export function getUnifiedDataStore(config?: UnifiedDataStoreConfig): UnifiedDataStore {
  if (!globalStore) {
    globalStore = new UnifiedDataStore(config);
  }
  return globalStore;
}

export function resetUnifiedDataStore(): void {
  globalStore = null;
}

logger.info('[UnifiedDataStore] Module loaded');
