import { IDataStore, FilterCondition, QueryOptions } from '../abstractions/IDataStore';
import { AsyncResult, Ok, Err } from '../types/Result';
import { logger } from '../../lib/logger';

const DB_NAME = 'twa-undergroundlab-db';
const DB_VERSION = 1;

interface DBStore {
  table: string;
  items: Map<string, any>;
}

export class SupabaseDataStoreShim implements IDataStore {
  private db: IDBDatabase | null = null;
  private stores: Map<string, DBStore> = new Map();

  async initialize(): Promise<void> {
    if (!('indexedDB' in typeof window !== 'undefined' ? window : {})) {
      logger.warn('IndexedDB not available, using in-memory storage');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized for data store shim');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'id' });
        }
      };
    });
  }

  async query<T>(
    table: string,
    filters: FilterCondition[] = [],
    options: QueryOptions = {}
  ): AsyncResult<T[], Error> {
    try {
      const items = this.getInMemoryStore(table).items;
      let results = Array.from(items.values()) as T[];

      filters.forEach((filter) => {
        results = results.filter(item =>
          this.matchesFilter((item as any)[filter.column], filter)
        );
      });

      if (options.orderBy) {
        results.sort((a, b) => {
          const aVal = (a as any)[options.orderBy!.column];
          const bVal = (b as any)[options.orderBy!.column];
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return options.orderBy!.ascending !== false ? cmp : -cmp;
        });
      }

      if (options.offset) {
        results = results.slice(options.offset);
      }

      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      return Ok(results);
    } catch (error) {
      logger.error(`[DataStore Shim] Query error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async queryOne<T>(
    table: string,
    filters: FilterCondition[]
  ): AsyncResult<T | null, Error> {
    try {
      const result = await this.query<T>(table, filters, { limit: 1 });
      if (result.ok) {
        return Ok(result.value.length > 0 ? result.value[0] : null);
      }
      return result;
    } catch (error) {
      logger.error(`[DataStore Shim] QueryOne error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): AsyncResult<T[], Error> {
    try {
      const store = this.getInMemoryStore(table);
      const items = Array.isArray(data) ? data : [data];

      const results: T[] = items.map((item) => {
        const id = Math.random().toString(36).substr(2, 9);
        const fullItem = { id, ...item } as T;
        store.items.set(id, fullItem);
        return fullItem;
      });

      await this.persistToIndexedDB(table, Array.from(store.items.values()));
      logger.info(`[DataStore Shim] Inserted ${results.length} items into ${table}`);
      return Ok(results);
    } catch (error) {
      logger.error(`[DataStore Shim] Insert error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async update<T>(
    table: string,
    filters: FilterCondition[],
    data: Partial<T>
  ): AsyncResult<T[], Error> {
    try {
      const store = this.getInMemoryStore(table);
      const items = Array.from(store.items.values());

      const updated: T[] = items
        .filter((item) =>
          filters.every((filter) =>
            this.matchesFilter((item as any)[filter.column], filter)
          )
        )
        .map((item) => {
          const updated = { ...item, ...data } as T;
          store.items.set((item as any).id, updated);
          return updated;
        });

      await this.persistToIndexedDB(table, Array.from(store.items.values()));
      logger.info(`[DataStore Shim] Updated ${updated.length} items in ${table}`);
      return Ok(updated);
    } catch (error) {
      logger.error(`[DataStore Shim] Update error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async delete(
    table: string,
    filters: FilterCondition[]
  ): AsyncResult<void, Error> {
    try {
      const store = this.getInMemoryStore(table);
      const items = Array.from(store.items.values());

      items.forEach((item) => {
        if (filters.every((filter) =>
          this.matchesFilter((item as any)[filter.column], filter)
        )) {
          store.items.delete((item as any).id);
        }
      });

      await this.persistToIndexedDB(table, Array.from(store.items.values()));
      logger.info(`[DataStore Shim] Deleted items from ${table}`);
      return Ok(undefined);
    } catch (error) {
      logger.error(`[DataStore Shim] Delete error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async rpc<T = unknown>(
    functionName: string,
    params: Record<string, unknown> = {}
  ): AsyncResult<T, Error> {
    try {
      logger.warn(`[DataStore Shim] RPC call: ${functionName}`, params);
      return Ok(null as any);
    } catch (error) {
      logger.error(`[DataStore Shim] RPC error for ${functionName}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  subscribe<T>(
    table: string,
    callback: (payload: T) => void,
    filters: FilterCondition[] = []
  ): () => void {
    logger.info(`[DataStore Shim] Subscription created for ${table}`);
    return () => {
      logger.info(`[DataStore Shim] Subscription removed for ${table}`);
    };
  }

  private getInMemoryStore(table: string): DBStore {
    if (!this.stores.has(table)) {
      this.stores.set(table, { table, items: new Map() });
    }
    return this.stores.get(table)!;
  }

  private async persistToIndexedDB(table: string, items: any[]): Promise<void> {
    if (!this.db || typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['tables'], 'readwrite');
        const store = transaction.objectStore('tables');
        store.put({ id: table, data: items, timestamp: Date.now() });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  private matchesFilter(value: any, filter: FilterCondition): boolean {
    switch (filter.operator) {
      case 'eq':
        return value === filter.value;
      case 'neq':
        return value !== filter.value;
      case 'gt':
        return value > filter.value;
      case 'gte':
        return value >= filter.value;
      case 'lt':
        return value < filter.value;
      case 'lte':
        return value <= filter.value;
      case 'in':
        return (filter.value as any[]).includes(value);
      case 'is':
        return value === filter.value;
      default:
        return true;
    }
  }
}
