import { IDataStore, QueryBuilder } from '../abstractions/IDataStore';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

class SupabaseQueryBuilder implements QueryBuilder {
  private queryBuilder: any;

  constructor(private client: any, private table: string) {
    this.queryBuilder = client.from(table);
  }

  select(columns?: string): this {
    this.queryBuilder = this.queryBuilder.select(columns || '*');
    return this;
  }

  insert(data: any): this {
    this.queryBuilder = this.queryBuilder.insert(data);
    return this;
  }

  update(data: any): this {
    this.queryBuilder = this.queryBuilder.update(data);
    return this;
  }

  delete(): this {
    this.queryBuilder = this.queryBuilder.delete();
    return this;
  }

  eq(column: string, value: any): this {
    this.queryBuilder = this.queryBuilder.eq(column, value);
    return this;
  }

  neq(column: string, value: any): this {
    this.queryBuilder = this.queryBuilder.neq(column, value);
    return this;
  }

  gt(column: string, value: any): this {
    this.queryBuilder = this.queryBuilder.gt(column, value);
    return this;
  }

  gte(column: string, value: any): this {
    this.queryBuilder = this.queryBuilder.gte(column, value);
    return this;
  }

  lt(column: string, value: any): this {
    this.queryBuilder = this.queryBuilder.lt(column, value);
    return this;
  }

  lte(column: string, value: any): this {
    this.queryBuilder = this.queryBuilder.lte(column, value);
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.queryBuilder = this.queryBuilder.ilike(column, pattern);
    return this;
  }

  like(column: string, pattern: string): this {
    this.queryBuilder = this.queryBuilder.like(column, pattern);
    return this;
  }

  in(column: string, values: any[]): this {
    this.queryBuilder = this.queryBuilder.in(column, values);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.queryBuilder = this.queryBuilder.order(column, options);
    return this;
  }

  limit(count: number): this {
    this.queryBuilder = this.queryBuilder.limit(count);
    return this;
  }

  async single(): Promise<any> {
    const { data, error } = await this.queryBuilder.single();
    return { success: !error, data, error };
  }

  async maybeSingle(): Promise<any> {
    const { data, error } = await this.queryBuilder.maybeSingle();
    return { success: !error, data, error };
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void): Promise<any> {
    try {
      const { data, error } = await this.queryBuilder;
      const result = { success: !error, data, error };
      if (resolve) {
        resolve(result);
      }
      return result;
    } catch (err) {
      logger.error(`[SupabaseQueryBuilder] Query failed for ${this.table}`, err);
      const result = { success: false, data: null, error: err };
      if (reject) {
        reject(err);
      }
      return result;
    }
  }
}

class SupabaseDataStoreAdapter implements IDataStore {
  private client = supabase;

  from(table: string): QueryBuilder {
    return new SupabaseQueryBuilder(this.client, table);
  }

  async rpc<T = unknown>(functionName: string, params?: Record<string, unknown>) {
    try {
      const { data, error } = await this.client.rpc(functionName, params);

      if (error) {
        logger.error(`[SupabaseDataStore] RPC failed for ${functionName}`, error);
        return { success: false, data: null, error };
      }

      return { success: true, data: data as T, error: null };
    } catch (error) {
      logger.error(`[SupabaseDataStore] RPC exception for ${functionName}`, error);
      return { success: false, data: null, error };
    }
  }

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
