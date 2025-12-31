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
    logger.debug('[LocalDataStore] Seeding initial data');

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
    this.tables.set('zones', []);
    this.tables.set('driver_zones', []);
    this.tables.set('tasks', []);
    this.tables.set('restock_requests', []);
    this.tables.set('platform_products', []);
    this.tables.set('business_products', []);

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
