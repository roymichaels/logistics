import type {
  Order,
  RestockRequest,
  Task,
  CreateOrderInput,
  RestockRequestInput
} from '../data/types';

const DB_NAME = 'logistics-offline';
const DB_VERSION = 1;

type CollectionKey = 'orders' | 'tasks' | 'restockRequests';

interface StoredCollection<T> {
  name: CollectionKey;
  data: T[];
  updatedAt: string;
}

export interface OfflineMutationMeta {
  summary?: string;
  entityId?: string;
  entityType?: string;
}

export interface OfflineMutationPayloads {
  createOrder: { input: CreateOrderInput };
  submitRestock: { input: RestockRequestInput };
  [key: string]: any;
}

export interface OfflineMutation<TPayload = any> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  lastTriedAt?: string;
  meta?: OfflineMutationMeta;
}

export interface MutationProcessResult {
  status: 'success' | 'retry' | 'discard';
  message?: string;
  serverId?: string;
}

export interface OfflineDiagnostics {
  collections: Record<CollectionKey, { count: number; updatedAt?: string | null }>;
  mutations: {
    pending: number;
    lastError?: string;
    lastAttemptAt?: string;
  };
}

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

const memoryCollections = new Map<CollectionKey, StoredCollection<any>>();
const memoryMutations = new Map<string, OfflineMutation<any>>();

let dbPromise: Promise<IDBDatabase> | null = null;

function createDbPromise(): Promise<IDBDatabase> {
  if (!isBrowser) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'name' });
        }

        if (!db.objectStoreNames.contains('mutations')) {
          const store = db.createObjectStore('mutations', { keyPath: 'id' });
          store.createIndex('by_type', 'type', { unique: false });
          store.createIndex('by_created_at', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open offline database'));
      };
    });
  }

  return dbPromise;
}

async function getDb(): Promise<IDBDatabase> {
  if (!isBrowser) {
    throw new Error('IndexedDB is not available');
  }

  return createDbPromise();
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

const mutationHandlers = new Map<string, (mutation: OfflineMutation<any>) => Promise<MutationProcessResult | void>>();
let flushInProgress = false;
let flushRequested = false;

function generateMutationId(prefix: string): string {
  const random = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
}

function sortByCreatedAt<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  if (!error) {
    return false;
  }

  const message = typeof error === 'string' ? error : (error as any)?.message;
  if (!message) {
    return false;
  }

  return /network|failed to fetch|offline|timed out/i.test(String(message));
}

async function putCollection<T>(collection: StoredCollection<T>): Promise<void> {
  if (!isBrowser) {
    memoryCollections.set(collection.name, collection);
    return;
  }

  const db = await getDb();
  const tx = db.transaction('collections', 'readwrite');
  tx.objectStore('collections').put(collection);
  await transactionDone(tx);
}

async function readCollection<T>(name: CollectionKey): Promise<StoredCollection<T> | undefined> {
  if (!isBrowser) {
    return memoryCollections.get(name);
  }

  const db = await getDb();
  const tx = db.transaction('collections', 'readonly');
  const store = tx.objectStore('collections');
  const record = await promisifyRequest<StoredCollection<T> | undefined>(store.get(name));
  await transactionDone(tx);
  return record;
}

async function deleteCollections(names: CollectionKey[]): Promise<void> {
  if (!isBrowser) {
    names.forEach(name => memoryCollections.delete(name));
    return;
  }

  const db = await getDb();
  const tx = db.transaction('collections', 'readwrite');
  const store = tx.objectStore('collections');
  for (const name of names) {
    store.delete(name);
  }
  await transactionDone(tx);
}

async function clearAllStores(): Promise<void> {
  if (!isBrowser) {
    memoryCollections.clear();
    memoryMutations.clear();
    return;
  }

  const db = await getDb();
  const tx = db.transaction(['collections', 'mutations'], 'readwrite');
  tx.objectStore('collections').clear();
  tx.objectStore('mutations').clear();
  await transactionDone(tx);
}

async function getAllMutations(): Promise<OfflineMutation<any>[]> {
  if (!isBrowser) {
    return sortByCreatedAt(Array.from(memoryMutations.values()));
  }

  const db = await getDb();
  const tx = db.transaction('mutations', 'readonly');
  const store = tx.objectStore('mutations');
  const mutations = await promisifyRequest<OfflineMutation<any>[]>(store.getAll());
  await transactionDone(tx);
  return sortByCreatedAt(mutations);
}

async function putMutation(mutation: OfflineMutation<any>): Promise<void> {
  if (!isBrowser) {
    memoryMutations.set(mutation.id, mutation);
    return;
  }

  const db = await getDb();
  const tx = db.transaction('mutations', 'readwrite');
  tx.objectStore('mutations').put(mutation);
  await transactionDone(tx);
}

async function deleteMutation(id: string): Promise<void> {
  if (!isBrowser) {
    memoryMutations.delete(id);
    return;
  }

  const db = await getDb();
  const tx = db.transaction('mutations', 'readwrite');
  tx.objectStore('mutations').delete(id);
  await transactionDone(tx);
}

async function processPendingMutations(): Promise<void> {
  const mutations = await getAllMutations();
  if (mutations.length === 0) {
    return;
  }

  for (const mutation of mutations) {
    const handler = mutationHandlers.get(mutation.type);
    if (!handler) {
      continue;
    }

    try {
      const result = await handler(mutation) ?? { status: 'success' as const };

      if (result.status === 'success' || result.status === 'discard') {
        await deleteMutation(mutation.id);
        continue;
      }

      await putMutation({
        ...mutation,
        retryCount: mutation.retryCount + 1,
        lastError: result.message,
        lastTriedAt: new Date().toISOString()
      });
      break;
    } catch (error) {
      if (isNetworkError(error)) {
        await putMutation({
          ...mutation,
          retryCount: mutation.retryCount + 1,
          lastError: error instanceof Error ? error.message : 'Network error',
          lastTriedAt: new Date().toISOString()
        });
        break;
      }

      console.error('Discarding offline mutation due to unrecoverable error', error);
      await deleteMutation(mutation.id);
    }
  }
}

async function flushMutationsInternal(): Promise<void> {
  if (flushInProgress) {
    flushRequested = true;
    return;
  }

  flushInProgress = true;

  try {
    do {
      flushRequested = false;
      await processPendingMutations();
    } while (flushRequested);
  } finally {
    flushInProgress = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushMutationsInternal();
  });
}

export const offlineStore = {
  isAvailable(): boolean {
    return isBrowser;
  },

  isOfflineError(error: unknown): boolean {
    return isNetworkError(error);
  },

  async getCollection<T extends Order | Task | RestockRequest>(name: CollectionKey): Promise<T[]> {
    try {
      const record = await readCollection<T>(name);
      return record?.data ?? [];
    } catch (error) {
      console.warn(`Failed to read offline collection ${name}:`, error);
      return [];
    }
  },

  async setCollection<T extends Order | Task | RestockRequest>(name: CollectionKey, data: T[]): Promise<void> {
    try {
      await putCollection<T>({ name, data, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.warn(`Failed to persist offline collection ${name}:`, error);
    }
  },

  async clearCollections(names?: CollectionKey[]): Promise<void> {
    const toClear = names ?? ['orders', 'tasks', 'restockRequests'];
    try {
      await deleteCollections(toClear);
    } catch (error) {
      console.warn('Failed to clear offline collections:', error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await clearAllStores();
    } catch (error) {
      console.warn('Failed to clear offline data:', error);
    }
  },

  async queueMutation<TType extends keyof OfflineMutationPayloads>(
    type: TType,
    payload: OfflineMutationPayloads[TType],
    options?: { meta?: OfflineMutationMeta }
  ): Promise<OfflineMutation<OfflineMutationPayloads[TType]>> {
    const mutation: OfflineMutation<OfflineMutationPayloads[TType]> = {
      id: generateMutationId(type),
      type: String(type),
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      meta: options?.meta
    };

    await putMutation(mutation);
    void flushMutationsInternal();
    return mutation;
  },

  async getMutations(): Promise<OfflineMutation<any>[]> {
    return getAllMutations();
  },

  registerMutationHandler<TType extends keyof OfflineMutationPayloads>(
    type: TType,
    handler: (mutation: OfflineMutation<OfflineMutationPayloads[TType]>) => Promise<MutationProcessResult | void>
  ): () => void {
    mutationHandlers.set(String(type), handler as (mutation: OfflineMutation<any>) => Promise<MutationProcessResult | void>);
    return () => {
      const current = mutationHandlers.get(String(type));
      if (current === handler) {
        mutationHandlers.delete(String(type));
      }
    };
  },

  async flushMutations(): Promise<void> {
    await flushMutationsInternal();
  },

  async getDiagnostics(): Promise<OfflineDiagnostics> {
    const [orders, tasks, restockRequests, mutations] = await Promise.all([
      readCollection<Order>('orders'),
      readCollection<Task>('tasks'),
      readCollection<RestockRequest>('restockRequests'),
      getAllMutations()
    ]);

    const latestMutation = mutations.reduce<OfflineMutation<any> | null>((latest, mutation) => {
      if (!latest) return mutation;
      return new Date(mutation.createdAt) > new Date(latest.createdAt) ? mutation : latest;
    }, null);

    return {
      collections: {
        orders: { count: orders?.data?.length ?? 0, updatedAt: orders?.updatedAt ?? null },
        tasks: { count: tasks?.data?.length ?? 0, updatedAt: tasks?.updatedAt ?? null },
        restockRequests: {
          count: restockRequests?.data?.length ?? 0,
          updatedAt: restockRequests?.updatedAt ?? null
        }
      },
      mutations: {
        pending: mutations.length,
        lastError: latestMutation?.lastError,
        lastAttemptAt: latestMutation?.lastTriedAt ?? latestMutation?.createdAt
      }
    };
  }
};

export type { CollectionKey };
