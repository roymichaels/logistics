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

export interface QueryBuilder {
  select(columns?: string): this;
  insert(data: any): this;
  update(data: any): this;
  delete(): this;
  eq(column: string, value: any): this;
  neq(column: string, value: any): this;
  gt(column: string, value: any): this;
  gte(column: string, value: any): this;
  lt(column: string, value: any): this;
  lte(column: string, value: any): this;
  ilike(column: string, pattern: string): this;
  like(column: string, pattern: string): this;
  in(column: string, values: any[]): this;
  order(column: string, options?: { ascending?: boolean }): this;
  limit(count: number): this;
  single(): Promise<any>;
  maybeSingle(): Promise<any>;
  then(resolve: (value: any) => void, reject?: (reason: any) => void): Promise<any>;
}

export interface IDataStore {
  from(table: string): QueryBuilder;

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
