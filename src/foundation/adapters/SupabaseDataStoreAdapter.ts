import { SupabaseClient } from '@supabase/supabase-js';
import { IDataStore, FilterCondition, QueryOptions } from '../abstractions/IDataStore';
import { AsyncResult, Ok, Err } from '../types/Result';
import { logger } from '../../lib/logger';

export class SupabaseDataStoreAdapter implements IDataStore {
  constructor(private client: SupabaseClient) {}

  async query<T>(
    table: string,
    filters: FilterCondition[] = [],
    options: QueryOptions = {}
  ): AsyncResult<T[], Error> {
    try {
      let query = this.client.from(table).select(options.select || '*');

      filters.forEach((filter) => {
        query = this.applyFilter(query, filter);
      });

      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`[DataStore] Query error on ${table}`, error);
        return Err(new Error(error.message));
      }

      return Ok((data as T[]) || []);
    } catch (error) {
      logger.error(`[DataStore] Unexpected error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async queryOne<T>(
    table: string,
    filters: FilterCondition[]
  ): AsyncResult<T | null, Error> {
    try {
      let query = this.client.from(table).select('*');

      filters.forEach((filter) => {
        query = this.applyFilter(query, filter);
      });

      const { data, error } = await query.maybeSingle();

      if (error) {
        logger.error(`[DataStore] QueryOne error on ${table}`, error);
        return Err(new Error(error.message));
      }

      return Ok((data as T) || null);
    } catch (error) {
      logger.error(`[DataStore] Unexpected error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): AsyncResult<T[], Error> {
    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data as any)
        .select();

      if (error) {
        logger.error(`[DataStore] Insert error on ${table}`, error);
        return Err(new Error(error.message));
      }

      return Ok((result as T[]) || []);
    } catch (error) {
      logger.error(`[DataStore] Unexpected error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async update<T>(
    table: string,
    filters: FilterCondition[],
    data: Partial<T>
  ): AsyncResult<T[], Error> {
    try {
      let query = this.client.from(table).update(data as any);

      filters.forEach((filter) => {
        query = this.applyFilter(query, filter);
      });

      const { data: result, error } = await query.select();

      if (error) {
        logger.error(`[DataStore] Update error on ${table}`, error);
        return Err(new Error(error.message));
      }

      return Ok((result as T[]) || []);
    } catch (error) {
      logger.error(`[DataStore] Unexpected error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async delete(
    table: string,
    filters: FilterCondition[]
  ): AsyncResult<void, Error> {
    try {
      let query = this.client.from(table).delete();

      filters.forEach((filter) => {
        query = this.applyFilter(query, filter);
      });

      const { error } = await query;

      if (error) {
        logger.error(`[DataStore] Delete error on ${table}`, error);
        return Err(new Error(error.message));
      }

      return Ok(undefined);
    } catch (error) {
      logger.error(`[DataStore] Unexpected error on ${table}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async rpc<T = unknown>(
    functionName: string,
    params: Record<string, unknown> = {}
  ): AsyncResult<T, Error> {
    try {
      const { data, error } = await this.client.rpc(functionName, params);

      if (error) {
        logger.error(`[DataStore] RPC error for ${functionName}`, error);
        return Err(new Error(error.message));
      }

      return Ok(data as T);
    } catch (error) {
      logger.error(`[DataStore] Unexpected error for ${functionName}`, error);
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  subscribe<T>(
    table: string,
    callback: (payload: T) => void,
    filters: FilterCondition[] = []
  ): () => void {
    let channel = this.client
      .channel(`${table}-changes`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        (payload) => {
          const record = payload.new as T;

          const matchesFilters = filters.every((filter) => {
            const value = (record as any)[filter.column];
            return this.matchesFilter(value, filter);
          });

          if (matchesFilters) {
            callback(record);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  private applyFilter(query: any, filter: FilterCondition): any {
    switch (filter.operator) {
      case 'eq':
        return query.eq(filter.column, filter.value);
      case 'neq':
        return query.neq(filter.column, filter.value);
      case 'gt':
        return query.gt(filter.column, filter.value);
      case 'gte':
        return query.gte(filter.column, filter.value);
      case 'lt':
        return query.lt(filter.column, filter.value);
      case 'lte':
        return query.lte(filter.column, filter.value);
      case 'like':
        return query.like(filter.column, filter.value);
      case 'ilike':
        return query.ilike(filter.column, filter.value);
      case 'in':
        return query.in(filter.column, filter.value as any[]);
      case 'is':
        return query.is(filter.column, filter.value);
      default:
        return query;
    }
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
