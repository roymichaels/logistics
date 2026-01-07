import { IDataStore } from '../abstractions/IDataStore';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

class SupabaseDataStoreAdapter implements IDataStore {
  private client = supabase;

  async query(table: string, filters?: Record<string, any>) {
    try {
      let query = this.client.from(table).select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`[SupabaseDataStore] Query failed for ${table}`, error);
        return { data: null, error };
      }

      return { data: data || [], error: null };
    } catch (error) {
      logger.error(`[SupabaseDataStore] Query exception for ${table}`, error);
      return { data: null, error };
    }
  }

  async insert(table: string, data: any) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error(`[SupabaseDataStore] Insert failed for ${table}`, error);
        return { data: null, error };
      }

      return { data: result, error: null };
    } catch (error) {
      logger.error(`[SupabaseDataStore] Insert exception for ${table}`, error);
      return { data: null, error };
    }
  }

  async update(table: string, id: string, data: any) {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`[SupabaseDataStore] Update failed for ${table}`, error);
        return { data: null, error };
      }

      return { data: result, error: null };
    } catch (error) {
      logger.error(`[SupabaseDataStore] Update exception for ${table}`, error);
      return { data: null, error };
    }
  }

  async delete(table: string, id: string) {
    try {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id);

      if (error) {
        logger.error(`[SupabaseDataStore] Delete failed for ${table}`, error);
        return { data: null, error };
      }

      return { data: { success: true }, error: null };
    } catch (error) {
      logger.error(`[SupabaseDataStore] Delete exception for ${table}`, error);
      return { data: null, error };
    }
  }

  subscribe(table: string, callback: (payload: any) => void) {
    const channel = this.client
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          logger.debug(`[SupabaseDataStore] Change detected in ${table}`, payload);
          callback(payload);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      }
    };
  }
}

export function createDataStoreAdapter(client?: any): IDataStore {
  logger.info('Creating data store adapter: Supabase (real database)');
  return new SupabaseDataStoreAdapter();
}
