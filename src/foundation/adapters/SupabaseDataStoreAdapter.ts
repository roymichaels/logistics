import { frontendOnlyDataStore } from '../../lib/frontendOnlyDataStore';
import { logger } from '../../lib/logger';

export class SupabaseDataStoreAdapter {
  private store = frontendOnlyDataStore;

  constructor(client?: any) {
    logger.info('[FRONTEND-ONLY] SupabaseDataStoreAdapter initialized');
  }

  from(table: string) {
    const self = this;

    return {
      select: async (columns?: string) => {
        const data = await self.store.query(table);
        return { data, error: null };
      },

      insert: async (payload: any) => {
        return self.store.insert(table, payload);
      },

      update: async (payload: any) => {
        const id = payload.id;
        if (!id) {
          return { data: null, error: new Error('No ID provided for update') };
        }
        return self.store.update(table, id, payload);
      },

      delete: async () => {
        return {
          eq: async (column: string, value: any) => {
            const data = await self.store.query(table, { [column]: value });
            if (data.length > 0) {
              await self.store.delete(table, data[0].id);
            }
            return { data: null, error: null };
          },
        };
      },

      eq: async (column: string, value: any) => {
        const data = await self.store.query(table, { [column]: value });
        return { data, error: null };
      },

      maybeSingle: async () => {
        const data = await self.store.query(table);
        return { data: data[0] || null, error: null };
      },

      single: async () => {
        const data = await self.store.query(table);
        return { data: data[0] || null, error: null };
      },
    };
  }

  async query(table: string) {
    return this.store.query(table);
  }

  async insert(table: string, data: any) {
    return this.store.insert(table, data);
  }

  async update(table: string, id: string, data: any) {
    return this.store.update(table, id, data);
  }

  async delete(table: string, id: string) {
    return this.store.delete(table, id);
  }

  subscribe(table: string, callback: any) {
    return this.store.subscribe(table, callback);
  }

  async storage() {
    return this.store.storage();
  }
}
