import { logger } from '@/lib/logger';

interface QueryResult<T = any> {
  success: boolean;
  data: T;
  error?: any;
}

class QueryBuilder {
  private tableName: string;
  private store: LocalDataStore;
  private filters: Array<{ column: string; op: string; value: any }> = [];
  private selectedColumns: string = '*';
  private orderColumn?: string;
  private orderAscending: boolean = true;
  private limitCount?: number;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData?: any;
  private updateData?: any;

  constructor(store: LocalDataStore, tableName: string) {
    this.store = store;
    this.tableName = tableName;
  }

  select(columns: string = '*'): this {
    this.selectedColumns = columns;
    this.operation = 'select';
    return this;
  }

  insert(data: any): this {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any): this {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push({ column, op: 'gt', value });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ column, op: 'gte', value });
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ column, op: 'lte', value });
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.filters.push({ column, op: 'ilike', value: pattern });
    return this;
  }

  like(column: string, pattern: string): this {
    this.filters.push({ column, op: 'like', value: pattern });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, op: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  async single(): Promise<QueryResult> {
    const result = await this.execute();
    if (!result.success) {
      return result;
    }
    if (!result.data || result.data.length === 0) {
      return {
        success: false,
        data: null,
        error: { message: 'No rows returned' },
      };
    }
    return {
      success: true,
      data: result.data[0],
    };
  }

  async maybeSingle(): Promise<QueryResult> {
    const result = await this.execute();
    if (!result.success) {
      return result;
    }
    return {
      success: true,
      data: result.data && result.data.length > 0 ? result.data[0] : null,
    };
  }

  then(resolve: (value: QueryResult) => void, reject?: (reason: any) => void): Promise<QueryResult> {
    return this.execute().then(resolve, reject);
  }

  private async execute(): Promise<QueryResult> {
    try {
      switch (this.operation) {
        case 'select':
          return this.executeSelect();
        case 'insert':
          return this.executeInsert();
        case 'update':
          return this.executeUpdate();
        case 'delete':
          return this.executeDelete();
        default:
          return {
            success: false,
            data: null,
            error: { message: 'Unknown operation' },
          };
      }
    } catch (error: any) {
      logger.error('[QueryBuilder] Query execution error', error);
      return {
        success: false,
        data: null,
        error: { message: error.message || 'Query execution failed' },
      };
    }
  }

  private executeSelect(): QueryResult {
    let data = this.store.getTable(this.tableName);

    data = this.applyFilters(data);

    if (this.orderColumn) {
      data = this.applyOrder(data);
    }

    if (this.limitCount !== undefined) {
      data = data.slice(0, this.limitCount);
    }

    return {
      success: true,
      data: data,
    };
  }

  private executeInsert(): QueryResult {
    const table = this.store.getTable(this.tableName);
    const dataArray = Array.isArray(this.insertData) ? this.insertData : [this.insertData];

    const inserted = dataArray.map((item) => {
      const record = {
        id: item.id || this.generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item,
      };
      table.push(record);
      return record;
    });

    this.store.saveToStorage();
    this.store.notifySubscribers(this.tableName, {
      eventType: 'INSERT',
      new: inserted[0],
      old: {},
    });

    return {
      success: true,
      data: inserted,
    };
  }

  private executeUpdate(): QueryResult {
    const table = this.store.getTable(this.tableName);
    const filtered = this.applyFilters(table);

    const updated = filtered.map((record) => {
      const index = table.findIndex((r) => r.id === record.id);
      if (index !== -1) {
        const oldRecord = { ...table[index] };
        table[index] = {
          ...table[index],
          ...this.updateData,
          updated_at: new Date().toISOString(),
        };
        this.store.notifySubscribers(this.tableName, {
          eventType: 'UPDATE',
          old: oldRecord,
          new: table[index],
        });
        return table[index];
      }
      return record;
    });

    this.store.saveToStorage();

    return {
      success: true,
      data: updated,
    };
  }

  private executeDelete(): QueryResult {
    const table = this.store.getTable(this.tableName);
    const filtered = this.applyFilters(table);

    filtered.forEach((record) => {
      const index = table.findIndex((r) => r.id === record.id);
      if (index !== -1) {
        const deletedRecord = { ...table[index] };
        table.splice(index, 1);
        this.store.notifySubscribers(this.tableName, {
          eventType: 'DELETE',
          old: deletedRecord,
          new: {},
        });
      }
    });

    this.store.saveToStorage();

    return {
      success: true,
      data: null,
    };
  }

  private applyFilters(data: any[]): any[] {
    return data.filter((record) => {
      return this.filters.every((filter) => {
        const value = record[filter.column];
        switch (filter.op) {
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
          case 'like':
            return String(value).includes(String(filter.value).replace(/%/g, ''));
          case 'ilike':
            return String(value)
              .toLowerCase()
              .includes(String(filter.value).replace(/%/g, '').toLowerCase());
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          default:
            return true;
        }
      });
    });
  }

  private applyOrder(data: any[]): any[] {
    if (!this.orderColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[this.orderColumn!];
      const bVal = b[this.orderColumn!];

      if (aVal === bVal) return 0;
      const comparison = aVal > bVal ? 1 : -1;
      return this.orderAscending ? comparison : -comparison;
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class LocalDataStore {
  private tables: Map<string, any[]> = new Map();
  private readonly STORAGE_KEY = 'app-local-datastore';
  private subscriptions: Map<string, Set<(payload: any) => void>> = new Map();

  constructor() {
    this.loadFromStorage();
    logger.info('[LocalDataStore] Initialized with', this.tables.size, 'tables');
  }

  from(tableName: string): QueryBuilder {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return new QueryBuilder(this, tableName);
  }

  async getProfile(): Promise<any> {
    try {
      const session = localStorage.getItem('wallet-session');
      if (!session) {
        logger.warn('[LocalDataStore] No wallet session found');
        return null;
      }

      const sessionData = JSON.parse(session);
      const userId = sessionData.user?.id || sessionData.walletAddress;

      const users = this.getTable('users');
      let user = users.find((u: any) => u.id === userId || u.wallet_address === userId);

      if (!user) {
        user = {
          id: userId,
          wallet_address: userId,
          role: sessionData.user?.role || 'customer',
          name: sessionData.user?.name || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(user);
        this.saveToStorage();
      }

      logger.info('[LocalDataStore] Profile loaded', { userId, role: user.role });
      return user;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to get profile', error);
      return null;
    }
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    if (!this.subscriptions.has(table)) {
      this.subscriptions.set(table, new Set());
    }

    const handlers = this.subscriptions.get(table)!;
    handlers.add(callback);

    logger.info('[LocalDataStore] Subscribed to table', { table, handlerCount: handlers.size });

    return () => {
      handlers.delete(callback);
      logger.info('[LocalDataStore] Unsubscribed from table', { table, handlerCount: handlers.size });
    };
  }

  notifySubscribers(table: string, payload: any): void {
    const handlers = this.subscriptions.get(table);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          logger.error('[LocalDataStore] Subscription handler error', { table, error });
        }
      });
    }
  }

  async getRoyalDashboardSnapshot(): Promise<any> {
    const orders = this.getTable('orders');
    const drivers = this.getTable('drivers');
    const inventory = this.getTable('inventory');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersToday = orders.filter((o: any) => {
      const orderDate = new Date(o.created_at);
      return orderDate >= today;
    });

    return {
      metrics: {
        revenueToday: ordersToday.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
        ordersToday: ordersToday.length,
        deliveredToday: ordersToday.filter((o: any) => o.status === 'delivered').length,
        averageOrderValue: ordersToday.length > 0
          ? ordersToday.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) / ordersToday.length
          : 0,
        pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
        activeDrivers: drivers.filter((d: any) => d.is_online).length,
        coveragePercent: 85,
        outstandingDeliveries: orders.filter((o: any) =>
          o.status === 'assigned' || o.status === 'in_transit'
        ).length,
      },
      revenueTrend: [],
      ordersPerHour: [],
      agents: drivers.slice(0, 5).map((d: any) => ({
        id: d.id,
        name: d.name || 'Driver',
        status: d.status || 'available',
        zone: d.current_zone_id,
        ordersInProgress: 0,
        lastUpdated: d.updated_at || new Date().toISOString(),
      })),
      zones: [],
      lowStockAlerts: inventory.filter((i: any) => i.quantity < 10).slice(0, 5).map((i: any) => ({
        product_id: i.product_id,
        product_name: i.product?.name || 'Unknown',
        location_id: i.location_id || 'warehouse',
        location_name: 'Main Warehouse',
        on_hand_quantity: i.quantity || 0,
        low_stock_threshold: 10,
        triggered_at: new Date().toISOString(),
      })),
      restockQueue: [],
      generatedAt: new Date().toISOString(),
    };
  }

  getTable(tableName: string): any[] {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return this.tables.get(tableName)!;
  }

  saveToStorage(): void {
    try {
      const data: Record<string, any[]> = {};
      this.tables.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('[LocalDataStore] Failed to save to storage', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.tables.set(key, value as any[]);
        });
        logger.info('[LocalDataStore] Loaded data from storage');
      } else {
        this.seed();
      }
    } catch (error) {
      logger.error('[LocalDataStore] Failed to load from storage', error);
      this.seed();
    }
  }

  private seed(): void {
    logger.info('[LocalDataStore] Seeding initial data');

    this.tables.set('products', [
      {
        id: 'prod-1',
        business_id: 'biz-1',
        name: 'Sample Product',
        description: 'This is a sample product',
        price: 99.99,
        category: 'electronics',
        image_url: 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg',
        stock_quantity: 50,
        is_available: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    this.tables.set('orders', []);
    this.tables.set('drivers', []);
    this.tables.set('businesses', [
      {
        id: 'biz-1',
        name: 'Demo Business',
        description: 'Sample business for testing',
        business_type_id: 'type-1',
        owner_id: 'owner-1',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    this.tables.set('inventory', []);
    this.tables.set('messages', []);
    this.tables.set('users', []);
    this.tables.set('categories', []);
    this.tables.set('roles', []);

    this.saveToStorage();
  }

  clearAll(): void {
    this.tables.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    this.seed();
    logger.info('[LocalDataStore] Cleared all data and reseeded');
  }
}
