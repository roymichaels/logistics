import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  DataStore,
  User,
  Order,
  Task,
  Product,
  Route,
  GroupChat,
  Channel,
  Notification,
  BootstrapConfig,
  InventoryRecord,
  DriverInventoryRecord,
  RestockRequest,
  InventoryLog,
  InventoryAlert,
  RolePermissions,
  RestockRequestStatus,
  InventoryLogType
} from '../../data/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseDataStore implements DataStore {
  private user: User | null = null;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(private userTelegramId: string, private authToken?: string) {
    // Set auth token if provided
    if (authToken) {
      supabase.auth.setSession({
        access_token: authToken,
        refresh_token: '',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: userTelegramId,
          app_metadata: { telegram_id: userTelegramId },
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        }
      });
    }

    // Initialize real-time subscriptions
    this.initializeRealTimeSubscriptions();
  }

  private async refreshProductStock(productId: string) {
    const [{ data: inventory, error: inventoryError }, { data: driverBalances, error: driverError }] = await Promise.all([
      supabase
        .from('inventory')
        .select('central_quantity, reserved_quantity')
        .eq('product_id', productId)
        .maybeSingle(),
      supabase
        .from('driver_inventory')
        .select('quantity')
        .eq('product_id', productId)
    ]);

    if (inventoryError) throw inventoryError;
    if (driverError) throw driverError;

    const central = inventory?.central_quantity ?? 0;
    const reserved = inventory?.reserved_quantity ?? 0;
    const driverTotal = driverBalances?.reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0) ?? 0;
    const total = central + reserved + driverTotal;

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: total, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updateError) throw updateError;
  }

  private async recordInventoryLog(entry: {
    product_id: string;
    change_type: InventoryLogType;
    quantity_change: number;
    from_location?: string | null;
    to_location?: string | null;
    reference_id?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    const payload = {
      ...entry,
      created_by: this.userTelegramId,
      created_at: new Date().toISOString(),
      metadata: entry.metadata || {}
    };

    const { error } = await supabase.from('inventory_logs').insert(payload);
    if (error) throw error;
  }

  private initializeRealTimeSubscriptions() {
    // Subscribe to order changes
    const orderChannel = supabase.channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        this.notifyListeners('orders', payload);
      })
      .subscribe();

    this.subscriptions.set('orders', orderChannel);

    // Subscribe to task changes
    const taskChannel = supabase.channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        this.notifyListeners('tasks', payload);
      })
      .subscribe();

    this.subscriptions.set('tasks', taskChannel);

    // Subscribe to notification changes
    const notificationChannel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${this.userTelegramId}`
      }, (payload) => {
        this.notifyListeners('notifications', payload);
      })
      .subscribe();

    this.subscriptions.set('notifications', notificationChannel);

    // Subscribe to product changes
    const productChannel = supabase.channel('products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        this.notifyListeners('products', payload);
      })
      .subscribe();

    this.subscriptions.set('products', productChannel);

    // Subscribe to inventory changes
    const inventoryChannel = supabase.channel('inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
        this.notifyListeners('inventory', payload);
      })
      .subscribe();

    this.subscriptions.set('inventory', inventoryChannel);

    // Subscribe to driver inventory changes
    const driverInventoryChannel = supabase.channel('driver_inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_inventory' }, (payload) => {
        this.notifyListeners('driver_inventory', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_inventory', driverInventoryChannel);

    // Subscribe to restock request changes
    const restockChannel = supabase.channel('restock_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restock_requests' }, (payload) => {
        this.notifyListeners('restock_requests', payload);
      })
      .subscribe();

    this.subscriptions.set('restock_requests', restockChannel);

    // Subscribe to inventory logs
    const logChannel = supabase.channel('inventory_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_logs' }, (payload) => {
        this.notifyListeners('inventory_logs', payload);
      })
      .subscribe();

    this.subscriptions.set('inventory_logs', logChannel);
  }

  private notifyListeners(table: string, payload: any) {
    const listeners = this.eventListeners.get(table);
    if (listeners) {
      listeners.forEach(callback => callback(payload));
    }
  }

  // Real-time subscription methods
  subscribeToChanges(table: string, callback: (payload: any) => void) {
    if (!this.eventListeners.has(table)) {
      this.eventListeners.set(table, new Set());
    }
    this.eventListeners.get(table)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(table);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Cleanup subscriptions
  cleanup() {
    this.subscriptions.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    this.eventListeners.clear();
  }

  // Auth & Profile
  async getProfile(): Promise<User> {
    if (this.user) return this.user;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', this.userTelegramId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Create user if doesn't exist
      const newUser: Omit<User, 'id'> = {
        telegram_id: this.userTelegramId,
        role: 'user',
        name: 'משתמש חדש',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (createError) throw createError;
      this.user = created;
      return created;
    }

    this.user = data;
    return data;
  }

  async updateProfile(updates: Partial<User>): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('telegram_id', this.userTelegramId);

    if (error) throw error;

    // Update cached user
    if (this.user) {
      this.user = { ...this.user, ...updates };
    }
  }

  // Products
  async listProducts(filters?: { category?: string; q?: string }): Promise<Product[]> {
    let query = supabase.from('products').select('*');

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.q) {
      query = query.or(`name.ilike.%${filters.q}%,sku.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getProduct(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    const now = new Date().toISOString();
    const { error: inventoryError } = await supabase
      .from('inventory')
      .upsert({
        product_id: data.id,
        central_quantity: input.stock_quantity ?? 0,
        reserved_quantity: 0,
        low_stock_threshold: 10,
        updated_at: now
      });

    if (inventoryError) throw inventoryError;

    if ((input.stock_quantity ?? 0) !== 0) {
      await this.recordInventoryLog({
        product_id: data.id,
        change_type: 'restock',
        quantity_change: input.stock_quantity ?? 0,
        to_location: 'central'
      });
    }

    return { id: data.id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (typeof updates.stock_quantity === 'number') {
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({
          central_quantity: updates.stock_quantity,
          updated_at: new Date().toISOString()
        })
        .eq('product_id', id);

      if (inventoryError) throw inventoryError;

      await this.refreshProductStock(id);
    }
  }

  // Inventory
  async listInventory(filters?: { product_id?: string }): Promise<InventoryRecord[]> {
    let query = supabase
      .from('inventory')
      .select('*, products(*)');

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      central_quantity: row.central_quantity,
      reserved_quantity: row.reserved_quantity,
      low_stock_threshold: row.low_stock_threshold,
      updated_at: row.updated_at,
      product: row.products || undefined
    }));
  }

  async getInventory(productId: string): Promise<InventoryRecord | null> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*, products(*)')
      .eq('product_id', productId)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      product_id: data.product_id,
      central_quantity: data.central_quantity,
      reserved_quantity: data.reserved_quantity,
      low_stock_threshold: data.low_stock_threshold,
      updated_at: data.updated_at,
      product: data.products || undefined
    };
  }

  async listDriverInventory(filters?: { driver_id?: string; product_id?: string }): Promise<DriverInventoryRecord[]> {
    let query = supabase
      .from('driver_inventory')
      .select('*, products(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      driver_id: row.driver_id,
      quantity: row.quantity,
      updated_at: row.updated_at,
      product: row.products || undefined
    }));
  }

  async listRestockRequests(filters?: { status?: RestockRequestStatus | 'all'; onlyMine?: boolean }): Promise<RestockRequest[]> {
    let query = supabase
      .from('restock_requests')
      .select('*, products(*)');

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.onlyMine) {
      query = query.eq('requested_by', this.userTelegramId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      requested_by: row.requested_by,
      requested_quantity: row.requested_quantity,
      status: row.status,
      approved_by: row.approved_by,
      approved_quantity: row.approved_quantity,
      fulfilled_by: row.fulfilled_by,
      fulfilled_quantity: row.fulfilled_quantity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product: row.products || undefined
    }));
  }

  async submitRestockRequest(input: { product_id: string; requested_quantity: number; notes?: string }): Promise<{ id: string }> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_request_restock) {
      throw new Error('אין לך הרשאה לבקש חידוש מלאי');
    }

    const now = new Date().toISOString();

    const { data: request, error } = await supabase
      .from('restock_requests')
      .insert({
        product_id: input.product_id,
        requested_by: this.userTelegramId,
        requested_quantity: input.requested_quantity,
        status: 'pending',
        notes: input.notes || null,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (error) throw error;

    const { data: inventoryRow, error: inventoryFetchError } = await supabase
      .from('inventory')
      .select('id, reserved_quantity')
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (inventoryFetchError) throw inventoryFetchError;

    const reservedQuantity = (inventoryRow?.reserved_quantity ?? 0) + input.requested_quantity;

    const { error: inventoryUpdateError } = inventoryRow
      ? await supabase
          .from('inventory')
          .update({ reserved_quantity: reservedQuantity, updated_at: now })
          .eq('product_id', input.product_id)
      : await supabase
          .from('inventory')
          .insert({
            product_id: input.product_id,
            central_quantity: 0,
            reserved_quantity: reservedQuantity,
            low_stock_threshold: 10,
            updated_at: now
          });

    if (inventoryUpdateError) throw inventoryUpdateError;

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'reservation',
      quantity_change: input.requested_quantity,
      from_location: 'supplier',
      to_location: 'reserved',
      reference_id: request.id,
      metadata: { note: input.notes || null, action: 'restock_request_created' }
    });

    await this.refreshProductStock(input.product_id);

    return { id: request.id };
  }

  async approveRestockRequest(id: string, input: { approved_quantity: number; notes?: string }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_approve_restock) {
      throw new Error('אין לך הרשאה לאשר בקשות חידוש');
    }

    const now = new Date().toISOString();

    const { data: request, error: fetchError } = await supabase
      .from('restock_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('בקשת החידוש לא נמצאה');

    const { data: inventoryRow, error: inventoryFetchError } = await supabase
      .from('inventory')
      .select('reserved_quantity')
      .eq('product_id', request.product_id)
      .maybeSingle();

    if (inventoryFetchError) throw inventoryFetchError;

    const reservedBefore = inventoryRow?.reserved_quantity ?? 0;
    const requestedQty = request.requested_quantity ?? 0;
    const approvedQty = input.approved_quantity;
    const reservedAfter = Math.max(0, reservedBefore - requestedQty + approvedQty);

    const [{ error: updateRequestError }, { error: updateInventoryError }] = await Promise.all([
      supabase
        .from('restock_requests')
        .update({
          status: 'approved',
          approved_by: this.userTelegramId,
          approved_quantity: approvedQty,
          notes: input.notes || null,
          updated_at: now
        })
        .eq('id', id),
      supabase
        .from('inventory')
        .update({ reserved_quantity: reservedAfter, updated_at: now })
        .eq('product_id', request.product_id)
    ]);

    if (updateRequestError) throw updateRequestError;
    if (updateInventoryError) throw updateInventoryError;

    await this.recordInventoryLog({
      product_id: request.product_id,
      change_type: 'adjustment',
      quantity_change: approvedQty,
      from_location: 'reserved',
      to_location: 'inbound',
      reference_id: id,
      metadata: { note: input.notes || null, action: 'restock_request_approved' }
    });

    await this.refreshProductStock(request.product_id);
  }

  async fulfillRestockRequest(id: string, input: { fulfilled_quantity: number; notes?: string }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_fulfill_restock) {
      throw new Error('אין לך הרשאה לסמן אספקת חידוש');
    }

    const now = new Date().toISOString();

    const { data: request, error: fetchError } = await supabase
      .from('restock_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('בקשת החידוש לא נמצאה');

    const fulfilledQty = input.fulfilled_quantity;

    const { data: inventoryRow, error: inventoryError } = await supabase
      .from('inventory')
      .select('central_quantity, reserved_quantity')
      .eq('product_id', request.product_id)
      .maybeSingle();

    if (inventoryError) throw inventoryError;

    const central = (inventoryRow?.central_quantity ?? 0) + fulfilledQty;
    const reserved = Math.max(0, (inventoryRow?.reserved_quantity ?? 0) - fulfilledQty);

    const [{ error: updateRequestError }, { error: updateInventoryError }] = await Promise.all([
      supabase
        .from('restock_requests')
        .update({
          status: 'fulfilled',
          fulfilled_by: this.userTelegramId,
          fulfilled_quantity: fulfilledQty,
          notes: input.notes ?? request.notes ?? null,
          updated_at: now
        })
        .eq('id', id),
      supabase
        .from('inventory')
        .update({
          central_quantity: central,
          reserved_quantity: reserved,
          updated_at: now
        })
        .eq('product_id', request.product_id)
    ]);

    if (updateRequestError) throw updateRequestError;
    if (updateInventoryError) throw updateInventoryError;

    await this.recordInventoryLog({
      product_id: request.product_id,
      change_type: 'restock',
      quantity_change: fulfilledQty,
      from_location: 'inbound',
      to_location: 'central',
      reference_id: id,
      metadata: { note: input.notes || null, action: 'restock_request_fulfilled' }
    });

    await this.refreshProductStock(request.product_id);
  }

  async rejectRestockRequest(id: string, input?: { notes?: string }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_approve_restock) {
      throw new Error('אין לך הרשאה לדחות בקשות');
    }

    const now = new Date().toISOString();

    const { data: request, error: fetchError } = await supabase
      .from('restock_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('בקשת החידוש לא נמצאה');

    const { data: inventoryRow, error: inventoryError } = await supabase
      .from('inventory')
      .select('reserved_quantity')
      .eq('product_id', request.product_id)
      .maybeSingle();

    if (inventoryError) throw inventoryError;

    const reserved = Math.max(0, (inventoryRow?.reserved_quantity ?? 0) - (request.requested_quantity ?? 0));

    const [{ error: updateRequestError }, { error: updateInventoryError }] = await Promise.all([
      supabase
        .from('restock_requests')
        .update({
          status: 'rejected',
          approved_by: this.userTelegramId,
          notes: input?.notes || request.notes || null,
          updated_at: now
        })
        .eq('id', id),
      supabase
        .from('inventory')
        .update({ reserved_quantity: reserved, updated_at: now })
        .eq('product_id', request.product_id)
    ]);

    if (updateRequestError) throw updateRequestError;
    if (updateInventoryError) throw updateInventoryError;

    await this.recordInventoryLog({
      product_id: request.product_id,
      change_type: 'adjustment',
      quantity_change: -(request.requested_quantity ?? 0),
      from_location: 'reserved',
      to_location: 'cancelled',
      reference_id: id,
      metadata: { note: input?.notes || null, action: 'restock_request_rejected' }
    });

    await this.refreshProductStock(request.product_id);
  }

  async transferInventoryToDriver(input: { product_id: string; driver_id: string; quantity: number; notes?: string }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_transfer_inventory) {
      throw new Error('אין לך הרשאה להעביר מלאי לנהגים');
    }

    const now = new Date().toISOString();

    const { data: inventoryRow, error: inventoryError } = await supabase
      .from('inventory')
      .select('central_quantity')
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (inventoryError) throw inventoryError;

    const available = inventoryRow?.central_quantity ?? 0;
    if (available < input.quantity) {
      throw new Error('אין מספיק מלאי במחסן המרכזי');
    }

    const newCentral = available - input.quantity;

    const { data: driverRow, error: driverError } = await supabase
      .from('driver_inventory')
      .select('id, quantity')
      .eq('driver_id', input.driver_id)
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (driverError) throw driverError;

    const [inventoryResult, driverResult] = await Promise.all([
      supabase
        .from('inventory')
        .update({ central_quantity: newCentral, updated_at: now })
        .eq('product_id', input.product_id),
      driverRow
        ? supabase
            .from('driver_inventory')
            .update({ quantity: driverRow.quantity + input.quantity, updated_at: now })
            .eq('id', driverRow.id)
        : supabase
            .from('driver_inventory')
            .insert({
              driver_id: input.driver_id,
              product_id: input.product_id,
              quantity: input.quantity,
              updated_at: now
            })
    ]);

    const inventoryUpdateError = inventoryResult.error;
    const driverUpdateError = driverResult.error;

    if (inventoryUpdateError) throw inventoryUpdateError;
    if (driverUpdateError) throw driverUpdateError;

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'transfer',
      quantity_change: input.quantity,
      from_location: 'central',
      to_location: `driver:${input.driver_id}`,
      metadata: { note: input.notes || null }
    });

    await this.refreshProductStock(input.product_id);
  }

  async listInventoryLogs(filters?: { product_id?: string; limit?: number }): Promise<InventoryLog[]> {
    let query = supabase
      .from('inventory_logs')
      .select('*, products(*)');

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      change_type: row.change_type,
      quantity_change: row.quantity_change,
      from_location: row.from_location,
      to_location: row.to_location,
      reference_id: row.reference_id,
      created_by: row.created_by,
      created_at: row.created_at,
      metadata: row.metadata,
      product: row.products || undefined
    }));
  }

  async getLowStockAlerts(): Promise<InventoryAlert[]> {
    const inventory = await this.listInventory();
    return inventory
      .filter(record => record.central_quantity + record.reserved_quantity <= record.low_stock_threshold)
      .map(record => ({
        product_id: record.product_id,
        product_name: record.product?.name || record.product_id,
        central_quantity: record.central_quantity,
        reserved_quantity: record.reserved_quantity,
        low_stock_threshold: record.low_stock_threshold
      }));
  }

  async getRolePermissions(): Promise<RolePermissions> {
    const profile = await this.getProfile();

    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role', profile.role)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return data as RolePermissions;
    }

    const managerDefaults: RolePermissions = {
      role: profile.role,
      can_view_inventory: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_request_restock: ['manager', 'warehouse', 'dispatcher', 'driver'].includes(profile.role),
      can_approve_restock: ['manager', 'warehouse'].includes(profile.role),
      can_fulfill_restock: ['manager', 'warehouse'].includes(profile.role),
      can_transfer_inventory: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_adjust_inventory: ['manager', 'warehouse'].includes(profile.role)
    };

    return managerDefaults;
  }

  // Orders with advanced filtering
  async listOrders(filters?: {
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    assignedDriver?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Order[]> {
    let query = supabase.from('orders').select('*');

    // Apply role-based filtering
    const profile = await this.getProfile();
    if (profile.role === 'sales') {
      query = query.eq('created_by', this.userTelegramId);
    }

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Text search
    if (filters?.q) {
      query = query.or(`customer_name.ilike.%${filters.q}%,customer_phone.ilike.%${filters.q}%,customer_address.ilike.%${filters.q}%,notes.ilike.%${filters.q}%`);
    }

    // Date range filter
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Amount range filter
    if (filters?.minAmount) {
      query = query.gte('total_amount', filters.minAmount);
    }
    if (filters?.maxAmount) {
      query = query.lte('total_amount', filters.maxAmount);
    }

    // Assigned driver filter
    if (filters?.assignedDriver && filters.assignedDriver !== 'all') {
      query = query.eq('assigned_driver', filters.assignedDriver);
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  async getOrder(id: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createOrder(input: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...input,
        created_by: this.userTelegramId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  // Tasks
  async listMyTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', this.userTelegramId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listAllTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createTask(input: Omit<Task, 'id' | 'created_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...input,
        assigned_by: this.userTelegramId,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async completeTask(id: string, proof?: { photo?: string; location?: string; notes?: string }): Promise<void> {
    const updates: Partial<Task> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      proof_url: proof?.photo,
      location: proof?.location
    };

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  // Routes
  async getMyRoute(date: string): Promise<Route | null> {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('driver_id', this.userTelegramId)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createRoute(input: Omit<Route, 'id' | 'created_at'>): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('routes')
      .insert({
        ...input,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  }

  // Communications
  async listGroupChats(): Promise<GroupChat[]> {
    const { data, error } = await supabase
      .from('group_chats')
      .select('*')
      .contains('members', [this.userTelegramId])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async listChannels(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .contains('subscribers', [this.userTelegramId])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', this.userTelegramId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('recipient_id', this.userTelegramId);

    if (error) throw error;
  }

  // Bulk Operations
  async bulkUpdateOrderStatus(orderIds: string[], status: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', orderIds);

    if (error) throw error;
  }

  async bulkAssignTasks(taskIds: string[], assignedTo: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ assigned_to: assignedTo })
      .in('id', taskIds);

    if (error) throw error;
  }

  async bulkUpdateProductPrices(productIds: string[], priceMultiplier: number): Promise<void> {
    // Get current products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, price')
      .in('id', productIds);

    if (fetchError) throw fetchError;

    // Update each product with new price
    const updates = products?.map(product => ({
      id: product.id,
      price: Math.round(product.price * priceMultiplier * 100) / 100,
      updated_at: new Date().toISOString()
    }));

    if (updates && updates.length > 0) {
      const { error } = await supabase
        .from('products')
        .upsert(updates);

      if (error) throw error;
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', this.userTelegramId)
      .eq('read', false);

    if (error) throw error;
  }

  // Batch Operations
  async batchCreateProducts(products: Omit<Product, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ ids: string[] }> {
    const now = new Date().toISOString();
    const productsWithTimestamps = products.map(product => ({
      ...product,
      created_at: now,
      updated_at: now
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsWithTimestamps)
      .select('id');

    if (error) throw error;
    return { ids: data?.map(p => p.id) || [] };
  }

  async batchCreateTasks(tasks: Omit<Task, 'id' | 'created_at'>[]): Promise<{ ids: string[] }> {
    const now = new Date().toISOString();
    const tasksWithTimestamps = tasks.map(task => ({
      ...task,
      assigned_by: this.userTelegramId,
      created_at: now
    }));

    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksWithTimestamps)
      .select('id');

    if (error) throw error;
    return { ids: data?.map(t => t.id) || [] };
  }

  // Data Export
  async exportOrdersToCSV(filters?: any): Promise<string> {
    const orders = await this.listOrders(filters);

    const headers = ['ID', 'Customer', 'Phone', 'Address', 'Status', 'Total', 'Date'];
    const csvData = [
      headers.join(','),
      ...orders.map(order => [
        order.id,
        `"${order.customer_name}"`,
        order.customer_phone,
        `"${order.customer_address}"`,
        order.status,
        order.total_amount,
        new Date(order.created_at).toLocaleDateString('he-IL')
      ].join(','))
    ];

    return csvData.join('\n');
  }

  async exportProductsToCSV(): Promise<string> {
    const products = await this.listProducts();

    const headers = ['ID', 'Name', 'SKU', 'Price', 'Stock', 'Category', 'Location'];
    const csvData = [
      headers.join(','),
      ...products.map(product => [
        product.id,
        `"${product.name}"`,
        product.sku,
        product.price,
        product.stock_quantity,
        product.category,
        `"${product.warehouse_location || ''}"`
      ].join(','))
    ];

    return csvData.join('\n');
  }

  // Analytics helpers
  async getOrderStatsByDateRange(dateFrom: string, dateTo: string): Promise<any> {
    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount, created_at')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    if (error) throw error;

    const stats = {
      totalOrders: data?.length || 0,
      totalRevenue: data?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
      statusBreakdown: {} as Record<string, number>,
      averageOrderValue: 0
    };

    data?.forEach(order => {
      stats.statusBreakdown[order.status] = (stats.statusBreakdown[order.status] || 0) + 1;
    });

    stats.averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

    return stats;
  }

  async getTopProducts(limit: number = 10): Promise<any[]> {
    // This would typically be done with a proper analytics table
    // For now, we'll analyze order items
    const orders = await this.listOrders();
    const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};

    orders.forEach(order => {
      order.items.forEach((item: any) => {
        if (!productCounts[item.product_id]) {
          productCounts[item.product_id] = {
            name: item.product_name,
            count: 0,
            revenue: 0
          };
        }
        productCounts[item.product_id].count += item.quantity;
        productCounts[item.product_id].revenue += item.quantity * item.price;
      });
    });

    return Object.entries(productCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export function createSupabaseDataStore(userTelegramId: string, authToken?: string): DataStore {
  return new SupabaseDataStore(userTelegramId, authToken);
}