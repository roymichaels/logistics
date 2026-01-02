/**
 * Base Service Class
 *
 * Provides common functionality for all service modules.
 * Each service extends this to inherit shared capabilities.
 */

import { frontendOnlyDataStore } from '../../lib/frontendOnlyDataStore';
import { logger } from '../../lib/logger';

class SupabaseQueryBuilder {
  private tableName: string;
  private filters: Array<{ field: string; op: string; value: any }> = [];
  private orderField?: string;
  private orderAsc?: boolean;
  private limitValue?: number;
  private selectFields: string = '*';
  private operation?: 'select' | 'insert' | 'update' | 'delete';
  private operationData?: any;

  constructor(tableName: string) {
    this.tableName = tableName;
    this.operation = 'select';
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    this.operation = 'select';
    return this;
  }

  insert(data: any | any[]) {
    this.operation = 'insert';
    this.operationData = data;
    return this;
  }

  update(data: any) {
    this.operation = 'update';
    this.operationData = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: 'eq', value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: 'neq', value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ field, op: 'gt', value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, op: 'gte', value });
    return this;
  }

  lt(field: string, value: any) {
    this.filters.push({ field, op: 'lt', value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, op: 'lte', value });
    return this;
  }

  ilike(field: string, pattern: string) {
    this.filters.push({ field, op: 'ilike', value: pattern });
    return this;
  }

  like(field: string, pattern: string) {
    this.filters.push({ field, op: 'like', value: pattern });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ field, op: 'in', value: values });
    return this;
  }

  or(conditions: string) {
    this.filters.push({ field: '__or__', op: 'or', value: conditions });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  async single() {
    const result = await this.execute();
    if (result.error) return result;
    if (!result.data || result.data.length === 0) {
      return { data: null, error: new Error('No rows found') };
    }
    return { data: result.data[0], error: null };
  }

  async maybeSingle() {
    const result = await this.execute();
    if (result.error) return result;
    return { data: result.data?.[0] || null, error: null };
  }

  private applyFilters(rows: any[]): any[] {
    return rows.filter(row => {
      for (const filter of this.filters) {
        if (filter.op === 'or') {
          const orConditions = filter.value.split(',').map((c: string) => c.trim());
          const anyMatch = orConditions.some((condition: string) => {
            const match = condition.match(/(\w+)\.(ilike|eq|neq|gt|gte|lt|lte)\.(.+)/);
            if (!match) return false;
            const [, field, op, value] = match;
            return this.matchFilter(row, field, op, value.replace(/%/g, ''));
          });
          if (!anyMatch) return false;
        } else {
          if (!this.matchFilter(row, filter.field, filter.op, filter.value)) {
            return false;
          }
        }
      }
      return true;
    });
  }

  private matchFilter(row: any, field: string, op: string, value: any): boolean {
    const fieldValue = row[field];

    switch (op) {
      case 'eq':
        return fieldValue === value;
      case 'neq':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'ilike':
      case 'like':
        if (typeof fieldValue !== 'string') return false;
        const pattern = value.replace(/%/g, '');
        return fieldValue.toLowerCase().includes(pattern.toLowerCase());
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      default:
        return false;
    }
  }

  private async execute() {
    try {
      if (this.operation === 'insert') {
        return await frontendOnlyDataStore.insert(this.tableName, this.operationData);
      }

      if (this.operation === 'update') {
        const rows = await frontendOnlyDataStore.query(this.tableName);
        const filtered = this.applyFilters(rows);

        if (filtered.length === 0) {
          return { data: null, error: new Error('No rows to update') };
        }

        const updatePromises = filtered.map(row =>
          frontendOnlyDataStore.update(this.tableName, row.id, this.operationData)
        );
        await Promise.all(updatePromises);
        return { data: null, error: null };
      }

      if (this.operation === 'delete') {
        const rows = await frontendOnlyDataStore.query(this.tableName);
        const filtered = this.applyFilters(rows);

        if (filtered.length === 0) {
          return { data: null, error: new Error('No rows to delete') };
        }

        const deletePromises = filtered.map(row =>
          frontendOnlyDataStore.delete(this.tableName, row.id)
        );
        await Promise.all(deletePromises);
        return { data: null, error: null };
      }

      let rows = await frontendOnlyDataStore.query(this.tableName);
      rows = this.applyFilters(rows);

      if (this.orderField) {
        rows.sort((a, b) => {
          const aVal = a[this.orderField!];
          const bVal = b[this.orderField!];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return this.orderAsc ? comparison : -comparison;
        });
      }

      if (this.limitValue) {
        rows = rows.slice(0, this.limitValue);
      }

      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async then(resolve: (value: any) => any) {
    const result = await this.execute();
    return resolve(result);
  }
}

class SupabaseCompatibleClient {
  from(table: string) {
    return new SupabaseQueryBuilder(table);
  }
}

export abstract class BaseService {
  protected userId: string;
  protected userTelegramId: string;
  protected dataStore = frontendOnlyDataStore;
  protected supabase = new SupabaseCompatibleClient();

  constructor(userId: string) {
    this.userId = userId;
    this.userTelegramId = userId;
    logger.debug(`[FRONTEND-ONLY] BaseService initialized for user ${userId}`);
  }

  /**
   * Execute a query with error logging
   */
  protected async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      const { data, error } = await queryFn();
      if (error) {
        logger.error(errorMessage, error);
        throw error;
      }
      return data;
    } catch (error) {
      logger.error(errorMessage, error as Error);
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
