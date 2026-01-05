/**
 * Base Service Class
 *
 * Provides common functionality for all service modules.
 * Each service extends this to inherit shared capabilities.
 */

import { frontendOnlyDataStore } from '../../lib/frontendOnlyDataStore';
import { runtimeRegistry } from '../../lib/runtime-registry';

class QueryBuilderAdapter {
  private builder: any;

  constructor(builder: any) {
    this.builder = builder;
  }

  select(fields?: string) {
    this.builder.select(fields);
    return this;
  }

  insert(data: any) {
    this.builder.insert(data);
    return this;
  }

  update(data: any) {
    this.builder.update(data);
    return this;
  }

  delete() {
    this.builder.delete();
    return this;
  }

  eq(field: string, value: any) {
    this.builder.eq(field, value);
    return this;
  }

  neq(field: string, value: any) {
    this.builder.neq(field, value);
    return this;
  }

  gt(field: string, value: any) {
    this.builder.gt(field, value);
    return this;
  }

  gte(field: string, value: any) {
    this.builder.gte(field, value);
    return this;
  }

  lt(field: string, value: any) {
    this.builder.lt(field, value);
    return this;
  }

  lte(field: string, value: any) {
    this.builder.lte(field, value);
    return this;
  }

  ilike(field: string, pattern: string) {
    this.builder.ilike(field, pattern);
    return this;
  }

  like(field: string, pattern: string) {
    this.builder.like(field, pattern);
    return this;
  }

  in(field: string, values: any[]) {
    this.builder.in(field, values);
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.builder.order(field, options);
    return this;
  }

  limit(count: number) {
    this.builder.limit(count);
    return this;
  }

  async single() {
    const result = await this.builder.single();
    return { data: result.success ? result.data : null, error: result.error || null };
  }

  async maybeSingle() {
    const result = await this.builder.maybeSingle();
    return { data: result.success ? result.data : null, error: result.error || null };
  }

  async then(resolve: (value: any) => any) {
    const result = await this.builder.then((r: any) => r);
    return resolve({ data: result.success ? result.data : null, error: result.error || null });
  }
}

class DataStoreClient {
  private dataStore: any;

  constructor(dataStore: any) {
    this.dataStore = dataStore;
  }

  from(table: string) {
    return new QueryBuilderAdapter(this.dataStore.from(table));
  }
}

export abstract class BaseService {
  protected userId: string;
  protected userTelegramId: string;
  protected dataStore = frontendOnlyDataStore;
  protected supabase = new DataStoreClient(frontendOnlyDataStore);

  constructor(userId: string) {
    this.userId = userId;
    this.userTelegramId = userId;
  }

  /**
   * Execute a query with error tracking via runtime registry
   */
  protected async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T | null> {
    const startTime = Date.now();
    const serviceName = this.constructor.name;

    try {
      const { data, error } = await queryFn();
      const duration = Date.now() - startTime;

      if (error) {
        runtimeRegistry.registerFunctionCall(`${serviceName}.executeQuery`, duration, true);
        throw error;
      }

      runtimeRegistry.registerFunctionCall(`${serviceName}.executeQuery`, duration, false);
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      runtimeRegistry.registerFunctionCall(`${serviceName}.executeQuery`, duration, true);
      throw error;
    }
  }

  /**
   * Get current timestamp
   */
  protected now(): string {
    return new Date().toISOString();
  }
}
