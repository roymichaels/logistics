import { AsyncResult } from '../types';

export interface QueryOptions {
  select?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
}

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: unknown;
}

export interface IDataStore {
  query<T>(
    table: string,
    filters?: FilterCondition[],
    options?: QueryOptions
  ): AsyncResult<T[], Error>;

  queryOne<T>(
    table: string,
    filters: FilterCondition[]
  ): AsyncResult<T | null, Error>;

  insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): AsyncResult<T[], Error>;

  update<T>(
    table: string,
    filters: FilterCondition[],
    data: Partial<T>
  ): AsyncResult<T[], Error>;

  delete(
    table: string,
    filters: FilterCondition[]
  ): AsyncResult<void, Error>;

  rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
  ): AsyncResult<T, Error>;

  subscribe<T>(
    table: string,
    callback: (payload: T) => void,
    filters?: FilterCondition[]
  ): () => void;
}
