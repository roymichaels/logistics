import { logger } from './logger';
import { getSupabase } from './supabaseClient';

// Mock Supabase Data Store - Frontend only with localStorage/IndexedDB backing
export class SupabaseDataStore {
  private supabaseClient: any;
  private cache: Map<string, any[]> = new Map();
  private db: IDBDatabase | null = null;

  constructor(client?: any) {
    this.supabaseClient = client;
  }

  get supabase() {
    return this.supabaseClient || getSupabase();
  }

  async initialize() {
    try {
      const request = indexedDB.open('TwaDataStore', 1);

      request.onerror = () => {
        logger.warn('IndexedDB open failed, using memory cache only');
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized');
      };

      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        ['users', 'businesses', 'orders', 'drivers', 'inventory'].forEach(table => {
          if (!db.objectStoreNames.contains(table)) {
            db.createObjectStore(table, { keyPath: 'id' });
          }
        });
      };
    } catch (e) {
      logger.warn('IndexedDB initialization failed', e);
    }
  }

  async query(table: string, filters?: any) {
    try {
      if (this.db) {
        try {
          const transaction = this.db.transaction([table], 'readonly');
          const store = transaction.objectStore(table);
          const request = store.getAll();

          return new Promise((resolve) => {
            request.onsuccess = () => {
              resolve(request.result || []);
            };
            request.onerror = () => {
              resolve([]);
            };
          });
        } catch (e) {
          logger.warn(`IndexedDB query failed for ${table}`, e);
        }
      }

      return this.cache.get(table) || [];
    } catch (error) {
      logger.error(`Error querying ${table}`, error);
      return [];
    }
  }

  async insert(table: string, data: any) {
    try {
      const records = Array.isArray(data) ? data : [data];

      const existing = this.cache.get(table) || [];
      this.cache.set(table, [...existing, ...records]);

      if (this.db) {
        try {
          const transaction = this.db.transaction([table], 'readwrite');
          const store = transaction.objectStore(table);

          records.forEach(record => {
            store.add({ ...record, id: record.id || Date.now() });
          });
        } catch (e) {
          logger.warn(`IndexedDB insert failed for ${table}`, e);
        }
      }

      return records;
    } catch (error) {
      logger.error(`Error inserting into ${table}`, error);
      return [];
    }
  }

  async update(table: string, data: any, filters?: any) {
    try {
      const records = Array.isArray(data) ? data : [data];

      const existing = this.cache.get(table) || [];
      const updated = existing.map(item =>
        records.some(r => r.id === item.id) ? records.find(r => r.id === item.id) : item
      );
      this.cache.set(table, updated);

      if (this.db) {
        try {
          const transaction = this.db.transaction([table], 'readwrite');
          const store = transaction.objectStore(table);

          records.forEach(record => {
            store.put(record);
          });
        } catch (e) {
          logger.warn(`IndexedDB update failed for ${table}`, e);
        }
      }

      return records;
    } catch (error) {
      logger.error(`Error updating ${table}`, error);
      return [];
    }
  }

  async delete(table: string, filters?: any) {
    try {
      const existing = this.cache.get(table) || [];
      const filterId = (filters as any)?.id;
      if (filterId) {
        this.cache.set(table, existing.filter(item => item.id !== filterId));
      }

      if (this.db && filterId) {
        try {
          const transaction = this.db.transaction([table], 'readwrite');
          const store = transaction.objectStore(table);
          store.delete(filterId);
        } catch (e) {
          logger.warn(`IndexedDB delete failed for ${table}`, e);
        }
      }

      return [];
    } catch (error) {
      logger.error(`Error deleting from ${table}`, error);
      return [];
    }
  }

  async ensureUserProfile(userId: string, email?: string) {
    try {
      const profiles = await this.query('users', { id: userId });
      if (profiles.length === 0) {
        await this.insert('users', {
          id: userId,
          email: email || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      return true;
    } catch (error) {
      logger.warn('Failed to ensure user profile', error);
      return true;
    }
  }

  async ensureUserEmailRecord(userId: string, email: string) {
    return this.ensureUserProfile(userId, email);
  }

  async executeQuery(table: string, operation: string, data?: any, filters?: any) {
    switch (operation) {
      case 'select':
        return await this.query(table, filters);
      case 'insert':
        return await this.insert(table, data);
      case 'update':
        return await this.update(table, data, filters);
      case 'delete':
        return await this.delete(table, filters);
      default:
        return [];
    }
  }
}

export function createSupabaseDataStore(client?: any): SupabaseDataStore {
  return new SupabaseDataStore(client);
}

export function getSupabaseInstance() {
  return getSupabase();
}

export { getSupabaseInstance as supabase };

// Registration Record Functions
export interface ApproveUserRegistrationInput {
  role?: string;
  metadata?: Record<string, any>;
}

export async function fetchUserRegistrationRecord(telegramId: string) {
  return null;
}

export async function deleteUserRegistrationRecord(telegramId: string) {
  return { data: null, error: null };
}

export async function listUserRegistrationRecords(filters?: any) {
  return [];
}

export async function updateUserRegistrationRoleRecord(telegramId: string, input: ApproveUserRegistrationInput) {
  return { data: null, error: null };
}

export interface UpdateUserRegistrationRoleInput {
  role?: string;
}

export interface UpsertUserRegistrationInput {
  telegramId: string;
  status?: string;
  metadata?: Record<string, any>;
}

export async function approveUserRegistrationRecord(telegramId: string, input: ApproveUserRegistrationInput) {
  return { data: null, error: null };
}

export async function upsertUserRegistrationRecord(input: UpsertUserRegistrationInput) {
  return { data: null, error: null };
}
