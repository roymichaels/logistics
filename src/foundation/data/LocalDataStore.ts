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
    logger.debug('[LocalDataStore] Initialized with', this.tables.size, 'tables');
  }

  from(tableName: string): QueryBuilder {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return new QueryBuilder(this, tableName);
  }

  async query(tableName: string, options?: { where?: Record<string, any> }): Promise<any[]> {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }

    let data = this.getTable(tableName);

    if (options?.where) {
      data = data.filter(record => {
        return Object.entries(options.where!).every(([key, value]) => {
          return record[key] === value;
        });
      });
    }

    return data;
  }

  async update(tableName: string, id: string, updates: Record<string, any>): Promise<void> {
    if (!this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const data = this.getTable(tableName);
    const index = data.findIndex(record => record.id === id);

    if (index === -1) {
      throw new Error(`Record with id ${id} not found in ${tableName}`);
    }

    data[index] = {
      ...data[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveToStorage();
  }

  async getProfile(): Promise<any> {
    try {
      const session = localStorage.getItem('local-wallet-session');
      if (!session) {
        logger.warn('[LocalDataStore] No wallet session found');

        const devRole = localStorage.getItem('dev-console:role-override');
        if (devRole) {
          logger.debug('[LocalDataStore] Using dev role override:', devRole);
          return {
            id: 'dev-user',
            role: devRole,
            name: 'Dev User',
            wallet_address: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        return null;
      }

      const sessionData = JSON.parse(session);
      const userId = sessionData.wallet || sessionData.walletAddress || sessionData.user?.id;

      const devRole = localStorage.getItem('dev-console:role-override');
      const effectiveRole = devRole || sessionData.role || 'customer';

      const users = this.getTable('users');
      let user = users.find((u: any) => u.id === userId || u.wallet_address === userId);

      if (!user) {
        user = {
          id: userId,
          wallet_address: userId,
          role: effectiveRole,
          name: userId,
          auth_method: sessionData.walletType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(user);
        this.saveToStorage();
      } else {
        if (devRole && user.role !== devRole) {
          user.role = devRole;
          this.saveToStorage();
        }
      }

      logger.debug('[LocalDataStore] Profile loaded', { userId, role: user.role });
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

    logger.debug('[LocalDataStore] Subscribed to table', { table, handlerCount: handlers.size });

    return () => {
      handlers.delete(callback);
      logger.debug('[LocalDataStore] Unsubscribed from table', { table, handlerCount: handlers.size });
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
        logger.debug('[LocalDataStore] Loaded data from storage');
      } else {
        this.seed();
      }
    } catch (error) {
      logger.error('[LocalDataStore] Failed to load from storage', error);
      this.seed();
    }
  }

  private seed(): void {
    logger.debug('[LocalDataStore] Seeding comprehensive initial data');

    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const lastWeek = new Date(Date.now() - 604800000).toISOString();

    this.tables.set('businesses', [
      {
        id: 'biz-1',
        name: 'TechMart',
        name_hebrew: 'טכמארט',
        description: 'Electronics and gadgets store',
        business_type_id: 'retail',
        owner_id: 'user-owner-1',
        status: 'active',
        primary_color: '#2563eb',
        secondary_color: '#3b82f6',
        order_number_prefix: 'TM',
        default_currency: 'USD',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'biz-2',
        name: 'Fresh Foods',
        name_hebrew: 'פרש פודס',
        description: 'Organic groceries and fresh produce',
        business_type_id: 'food',
        owner_id: 'user-owner-2',
        status: 'active',
        primary_color: '#16a34a',
        secondary_color: '#22c55e',
        order_number_prefix: 'FF',
        default_currency: 'USD',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'biz-3',
        name: 'Fashion Hub',
        name_hebrew: 'פאשן האב',
        description: 'Trendy clothing and accessories',
        business_type_id: 'fashion',
        owner_id: 'user-owner-3',
        status: 'active',
        primary_color: '#dc2626',
        secondary_color: '#ef4444',
        order_number_prefix: 'FH',
        default_currency: 'USD',
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('users', [
      {
        id: 'user-superadmin-1',
        wallet_address: '0xSUPERADMIN',
        role: 'superadmin',
        name: 'Platform Super Admin',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-admin-1',
        wallet_address: '0xADMIN',
        role: 'admin',
        name: 'Platform Admin',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-owner-1',
        wallet_address: '0xOWNER1',
        role: 'business_owner',
        name: 'TechMart Owner',
        business_id: 'biz-1',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-owner-2',
        wallet_address: '0xOWNER2',
        role: 'business_owner',
        name: 'Fresh Foods Owner',
        business_id: 'biz-2',
        auth_method: 'sol',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-owner-3',
        wallet_address: '0xOWNER3',
        role: 'business_owner',
        name: 'Fashion Hub Owner',
        business_id: 'biz-3',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-manager-1',
        wallet_address: '0xMANAGER1',
        role: 'manager',
        name: 'Store Manager - TechMart',
        business_id: 'biz-1',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-dispatcher-1',
        wallet_address: '0xDISPATCH1',
        role: 'dispatcher',
        name: 'Dispatch Coordinator',
        business_id: 'biz-1',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-warehouse-1',
        wallet_address: '0xWAREHOUSE1',
        role: 'warehouse',
        name: 'Warehouse Staff',
        business_id: 'biz-1',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-sales-1',
        wallet_address: '0xSALES1',
        role: 'sales',
        name: 'Sales Rep - Jordan',
        business_id: 'biz-1',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'user-support-1',
        wallet_address: '0xSUPPORT1',
        role: 'customer_service',
        name: 'Support Agent - Emma',
        business_id: 'biz-1',
        auth_method: 'eth',
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('products', [
      {
        id: 'prod-1',
        business_id: 'biz-1',
        name: 'Wireless Headphones Pro',
        description: 'Premium noise-cancelling wireless headphones',
        price: 299.99,
        category: 'electronics',
        image_url: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg',
        stock_quantity: 45,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-2',
        business_id: 'biz-1',
        name: 'Smartphone X12',
        description: 'Latest flagship smartphone with 5G',
        price: 899.99,
        category: 'electronics',
        image_url: 'https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg',
        stock_quantity: 30,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-3',
        business_id: 'biz-1',
        name: 'Laptop UltraBook',
        description: 'Powerful ultrabook for professionals',
        price: 1499.99,
        category: 'electronics',
        image_url: 'https://images.pexels.com/photos/18105/pexels-photo.jpg',
        stock_quantity: 20,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-4',
        business_id: 'biz-1',
        name: 'Smart Watch Series 5',
        description: 'Fitness tracking smartwatch',
        price: 399.99,
        category: 'electronics',
        image_url: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg',
        stock_quantity: 60,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-5',
        business_id: 'biz-1',
        name: 'Wireless Mouse Pro',
        description: 'Ergonomic wireless mouse',
        price: 49.99,
        category: 'electronics',
        image_url: 'https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg',
        stock_quantity: 100,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-6',
        business_id: 'biz-2',
        name: 'Organic Apples',
        description: 'Fresh organic apples (per kg)',
        price: 5.99,
        category: 'fruits',
        image_url: 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg',
        stock_quantity: 500,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-7',
        business_id: 'biz-2',
        name: 'Fresh Tomatoes',
        description: 'Vine-ripened tomatoes (per kg)',
        price: 3.99,
        category: 'vegetables',
        image_url: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg',
        stock_quantity: 400,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-8',
        business_id: 'biz-2',
        name: 'Almond Milk',
        description: 'Organic unsweetened almond milk',
        price: 4.49,
        category: 'dairy',
        image_url: 'https://images.pexels.com/photos/4109998/pexels-photo-4109998.jpeg',
        stock_quantity: 150,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-9',
        business_id: 'biz-3',
        name: 'Denim Jacket',
        description: 'Classic denim jacket - unisex',
        price: 79.99,
        category: 'clothing',
        image_url: 'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg',
        stock_quantity: 25,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'prod-10',
        business_id: 'biz-3',
        name: 'Leather Sneakers',
        description: 'Premium leather casual sneakers',
        price: 129.99,
        category: 'footwear',
        image_url: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg',
        stock_quantity: 40,
        is_available: true,
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('drivers', [
      {
        id: 'driver-1',
        name: 'Alex Johnson',
        phone: '+1234567890',
        status: 'available',
        is_online: true,
        current_zone_id: 'zone-1',
        vehicle_type: 'car',
        vehicle_number: 'ABC-123',
        rating: 4.8,
        total_deliveries: 234,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'driver-2',
        name: 'Maria Garcia',
        phone: '+1234567891',
        status: 'busy',
        is_online: true,
        current_zone_id: 'zone-2',
        vehicle_type: 'bike',
        vehicle_number: 'XYZ-456',
        rating: 4.9,
        total_deliveries: 412,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'driver-3',
        name: 'John Smith',
        phone: '+1234567892',
        status: 'available',
        is_online: true,
        current_zone_id: 'zone-1',
        vehicle_type: 'car',
        vehicle_number: 'DEF-789',
        rating: 4.7,
        total_deliveries: 189,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'driver-4',
        name: 'Sarah Lee',
        phone: '+1234567893',
        status: 'offline',
        is_online: false,
        current_zone_id: 'zone-3',
        vehicle_type: 'scooter',
        vehicle_number: 'GHI-012',
        rating: 4.6,
        total_deliveries: 156,
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('orders', [
      {
        id: 'order-1',
        order_number: 'TM-001',
        business_id: 'biz-1',
        customer_id: 'customer-1',
        driver_id: 'driver-1',
        status: 'delivered',
        total_amount: 349.98,
        delivery_address: '123 Main St, City',
        customer_name: 'John Doe',
        customer_phone: '+1234567894',
        created_at: lastWeek,
        updated_at: yesterday,
        delivered_at: yesterday,
      },
      {
        id: 'order-2',
        order_number: 'TM-002',
        business_id: 'biz-1',
        customer_id: 'customer-2',
        driver_id: 'driver-2',
        status: 'in_transit',
        total_amount: 1549.98,
        delivery_address: '456 Oak Ave, City',
        customer_name: 'Jane Smith',
        customer_phone: '+1234567895',
        created_at: yesterday,
        updated_at: now,
      },
      {
        id: 'order-3',
        order_number: 'TM-003',
        business_id: 'biz-1',
        customer_id: 'customer-3',
        status: 'pending',
        total_amount: 899.99,
        delivery_address: '789 Pine Rd, City',
        customer_name: 'Bob Wilson',
        customer_phone: '+1234567896',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'order-4',
        order_number: 'FF-001',
        business_id: 'biz-2',
        customer_id: 'customer-4',
        driver_id: 'driver-3',
        status: 'delivered',
        total_amount: 45.89,
        delivery_address: '321 Elm St, City',
        customer_name: 'Alice Brown',
        customer_phone: '+1234567897',
        created_at: lastWeek,
        updated_at: yesterday,
        delivered_at: yesterday,
      },
      {
        id: 'order-5',
        order_number: 'FF-002',
        business_id: 'biz-2',
        customer_id: 'customer-5',
        status: 'preparing',
        total_amount: 67.32,
        delivery_address: '654 Maple Dr, City',
        customer_name: 'Charlie Davis',
        customer_phone: '+1234567898',
        created_at: yesterday,
        updated_at: now,
      },
    ]);

    this.tables.set('zones', [
      {
        id: 'zone-1',
        name: 'Downtown',
        description: 'City downtown area',
        polygon: JSON.stringify([[0, 0], [1, 0], [1, 1], [0, 1]]),
        is_active: true,
        business_id: 'biz-1',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'zone-2',
        name: 'North District',
        description: 'Northern residential area',
        polygon: JSON.stringify([[1, 1], [2, 1], [2, 2], [1, 2]]),
        is_active: true,
        business_id: 'biz-1',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'zone-3',
        name: 'South District',
        description: 'Southern commercial area',
        polygon: JSON.stringify([[0, -1], [1, -1], [1, 0], [0, 0]]),
        is_active: true,
        business_id: 'biz-2',
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('driver_zones', [
      {
        id: 'dz-1',
        driver_telegram_id: 'driver-1',
        zone_id: 'zone-1',
        active: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'dz-2',
        driver_telegram_id: 'driver-2',
        zone_id: 'zone-2',
        active: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'dz-3',
        driver_telegram_id: 'driver-3',
        zone_id: 'zone-1',
        active: true,
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'dz-4',
        driver_telegram_id: 'driver-4',
        zone_id: 'zone-3',
        active: true,
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('tasks', [
      {
        id: 'task-1',
        title: 'Review inventory levels',
        description: 'Check stock for popular items',
        status: 'pending',
        priority: 'high',
        assigned_to: 'user-warehouse-1',
        created_by: 'user-manager-1',
        business_id: 'biz-1',
        due_date: now,
        created_at: yesterday,
        updated_at: yesterday,
      },
      {
        id: 'task-2',
        title: 'Call supplier for restock',
        description: 'Order more headphones',
        status: 'in_progress',
        priority: 'medium',
        assigned_to: 'user-manager-1',
        created_by: 'user-owner-1',
        business_id: 'biz-1',
        due_date: now,
        created_at: lastWeek,
        updated_at: yesterday,
      },
      {
        id: 'task-3',
        title: 'Update product descriptions',
        description: 'Improve SEO for catalog',
        status: 'completed',
        priority: 'low',
        assigned_to: 'user-sales-1',
        created_by: 'user-manager-1',
        business_id: 'biz-1',
        completed_at: yesterday,
        created_at: lastWeek,
        updated_at: yesterday,
      },
    ]);

    this.tables.set('restock_requests', [
      {
        id: 'restock-1',
        product_id: 'prod-1',
        requested_quantity: 50,
        status: 'pending',
        requested_by: 'user-warehouse-1',
        business_id: 'biz-1',
        reason: 'Low stock alert',
        created_at: yesterday,
        updated_at: yesterday,
      },
      {
        id: 'restock-2',
        product_id: 'prod-2',
        requested_quantity: 30,
        status: 'approved',
        requested_by: 'user-warehouse-1',
        approved_by: 'user-manager-1',
        approved_quantity: 30,
        business_id: 'biz-1',
        reason: 'Upcoming promotion',
        approved_at: yesterday,
        created_at: lastWeek,
        updated_at: yesterday,
      },
    ]);

    this.tables.set('inventory', [
      {
        id: 'inv-1',
        product_id: 'prod-1',
        location_id: 'warehouse-main',
        quantity: 45,
        business_id: 'biz-1',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'inv-2',
        product_id: 'prod-2',
        location_id: 'warehouse-main',
        quantity: 30,
        business_id: 'biz-1',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'inv-3',
        product_id: 'prod-3',
        location_id: 'warehouse-main',
        quantity: 20,
        business_id: 'biz-1',
        created_at: lastWeek,
        updated_at: now,
      },
      {
        id: 'inv-4',
        product_id: 'prod-6',
        location_id: 'warehouse-fresh',
        quantity: 500,
        business_id: 'biz-2',
        created_at: lastWeek,
        updated_at: now,
      },
    ]);

    this.tables.set('messages', []);
    this.tables.set('categories', [
      { id: 'cat-1', name: 'Electronics', slug: 'electronics', created_at: lastWeek, updated_at: now },
      { id: 'cat-2', name: 'Food & Groceries', slug: 'food', created_at: lastWeek, updated_at: now },
      { id: 'cat-3', name: 'Fashion', slug: 'fashion', created_at: lastWeek, updated_at: now },
    ]);
    this.tables.set('roles', []);
    this.tables.set('platform_products', []);
    this.tables.set('business_products', []);

    logger.debug('[LocalDataStore] Seeded comprehensive data: 10 products, 5 orders, 4 drivers, 3 businesses, 10 users, 3 zones');
    this.saveToStorage();
  }

  async createBusiness(input: {
    name: string;
    name_hebrew: string;
    business_type: string;
    order_number_prefix: string;
    default_currency: 'ILS' | 'USD' | 'EUR';
    primary_color: string;
    secondary_color: string;
  }): Promise<any> {
    try {
      // Import the business service
      const { createBusiness: createBusinessService } = await import('../../services/business');

      // Call the service which now creates both business and user_business_roles records
      const result = await createBusinessService({
        name: input.name,
        nameHebrew: input.name_hebrew,
        businessType: input.business_type,
        orderNumberPrefix: input.order_number_prefix,
        defaultCurrency: input.default_currency,
        primaryColor: input.primary_color,
        secondaryColor: input.secondary_color,
      });

      logger.info('[LocalDataStore] Business created successfully:', result.id);
      return result;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to create business:', error);
      throw error;
    }
  }

  async listZones(): Promise<any[]> {
    try {
      const zones = this.getTable('zones');
      logger.debug('[LocalDataStore] Listed zones:', zones.length);
      return zones;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to list zones:', error);
      return [];
    }
  }

  async listDriverZones(): Promise<any[]> {
    try {
      const driverZones = this.getTable('driver_zones');
      logger.debug('[LocalDataStore] Listed driver zones:', driverZones.length);
      return driverZones;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to list driver zones:', error);
      return [];
    }
  }

  async assignDriverToZone(driverId: string, zoneId: string): Promise<void> {
    try {
      const driverZones = this.getTable('driver_zones');

      const existing = driverZones.find(
        (dz: any) => dz.driver_telegram_id === driverId && dz.zone_id === zoneId && dz.active
      );

      if (existing) {
        logger.debug('[LocalDataStore] Driver already assigned to zone');
        return;
      }

      const assignment = {
        id: this.generateId(),
        driver_telegram_id: driverId,
        zone_id: zoneId,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      driverZones.push(assignment);
      this.saveToStorage();
      this.notifySubscribers('driver_zones', {
        eventType: 'INSERT',
        new: assignment,
        old: {},
      });

      logger.info('[LocalDataStore] Assigned driver to zone:', { driverId, zoneId });
    } catch (error) {
      logger.error('[LocalDataStore] Failed to assign driver to zone:', error);
      throw error;
    }
  }

  async unassignDriverFromZone(driverId: string, zoneId: string): Promise<void> {
    try {
      const driverZones = this.getTable('driver_zones');

      const assignment = driverZones.find(
        (dz: any) => dz.driver_telegram_id === driverId && dz.zone_id === zoneId && dz.active
      );

      if (!assignment) {
        logger.warn('[LocalDataStore] Driver zone assignment not found');
        return;
      }

      assignment.active = false;
      assignment.updated_at = new Date().toISOString();

      this.saveToStorage();
      this.notifySubscribers('driver_zones', {
        eventType: 'UPDATE',
        old: { ...assignment, active: true },
        new: assignment,
      });

      logger.info('[LocalDataStore] Unassigned driver from zone:', { driverId, zoneId });
    } catch (error) {
      logger.error('[LocalDataStore] Failed to unassign driver from zone:', error);
      throw error;
    }
  }

  async listRestockRequests(filters?: { status?: string }): Promise<any[]> {
    try {
      let requests = this.getTable('restock_requests');

      if (filters?.status) {
        requests = requests.filter((r: any) => r.status === filters.status);
      }

      logger.debug('[LocalDataStore] Listed restock requests:', requests.length);
      return requests;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to list restock requests:', error);
      return [];
    }
  }

  async approveRestockRequest(id: string, data: { approved_quantity: number }): Promise<void> {
    try {
      const requests = this.getTable('restock_requests');
      const request = requests.find((r: any) => r.id === id);

      if (!request) {
        throw new Error('Restock request not found');
      }

      const oldRequest = { ...request };
      request.status = 'approved';
      request.approved_quantity = data.approved_quantity;
      request.approved_at = new Date().toISOString();
      request.updated_at = new Date().toISOString();

      this.saveToStorage();
      this.notifySubscribers('restock_requests', {
        eventType: 'UPDATE',
        old: oldRequest,
        new: request,
      });

      logger.info('[LocalDataStore] Approved restock request:', id);
    } catch (error) {
      logger.error('[LocalDataStore] Failed to approve restock request:', error);
      throw error;
    }
  }

  async rejectRestockRequest(id: string, data: { notes?: string }): Promise<void> {
    try {
      const requests = this.getTable('restock_requests');
      const request = requests.find((r: any) => r.id === id);

      if (!request) {
        throw new Error('Restock request not found');
      }

      const oldRequest = { ...request };
      request.status = 'rejected';
      request.rejection_notes = data.notes;
      request.rejected_at = new Date().toISOString();
      request.updated_at = new Date().toISOString();

      this.saveToStorage();
      this.notifySubscribers('restock_requests', {
        eventType: 'UPDATE',
        old: oldRequest,
        new: request,
      });

      logger.info('[LocalDataStore] Rejected restock request:', id);
    } catch (error) {
      logger.error('[LocalDataStore] Failed to reject restock request:', error);
      throw error;
    }
  }

  async listMyTasks(): Promise<any[]> {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        logger.warn('[LocalDataStore] No profile found for listMyTasks');
        return [];
      }

      const tasks = this.getTable('tasks');
      const myTasks = tasks.filter(
        (t: any) => t.assigned_to === profile.id || t.created_by === profile.id
      );

      logger.debug('[LocalDataStore] Listed my tasks:', myTasks.length);
      return myTasks;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to list my tasks:', error);
      return [];
    }
  }

  async createTask(data: any): Promise<any> {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        throw new Error('No authenticated user');
      }

      const tasks = this.getTable('tasks');
      const task = {
        id: this.generateId(),
        ...data,
        created_by: profile.id,
        status: data.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      tasks.push(task);
      this.saveToStorage();
      this.notifySubscribers('tasks', {
        eventType: 'INSERT',
        new: task,
        old: {},
      });

      logger.info('[LocalDataStore] Created task:', task.id);
      return task;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: any): Promise<any> {
    try {
      const tasks = this.getTable('tasks');
      const task = tasks.find((t: any) => t.id === id);

      if (!task) {
        throw new Error('Task not found');
      }

      const oldTask = { ...task };
      Object.assign(task, updates);
      task.updated_at = new Date().toISOString();

      this.saveToStorage();
      this.notifySubscribers('tasks', {
        eventType: 'UPDATE',
        old: oldTask,
        new: task,
      });

      logger.info('[LocalDataStore] Updated task:', id);
      return task;
    } catch (error) {
      logger.error('[LocalDataStore] Failed to update task:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  clearAll(): void {
    this.tables.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    this.seed();
    logger.debug('[LocalDataStore] Cleared all data and reseeded');
  }
}
