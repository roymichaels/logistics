import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  DataStore,
  User,
  Order,
  Task,
  Product,
  Route,
  ManagerDashboardSnapshot,
  DashboardHourlyPoint,
  DashboardDailyPoint,
  ZoneCoverageSnapshot,
  GroupChat,
  Channel,
  Notification,
  BootstrapConfig,
  InventoryRecord,
  DriverInventoryRecord,
  RestockRequest,
  InventoryLog,
  InventoryAlert,
  InventoryLocation,
  RolePermissions,
  RestockRequestStatus,
  InventoryLogType,
  SalesLog,
  CreateOrderInput,
  Zone,
  DriverZoneAssignment,
  DriverStatusRecord,
  DriverMovementLog,
  DriverAvailabilityStatus,
  DriverMovementAction
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
    const [{ data: balances, error: inventoryError }, { data: driverBalances, error: driverError }] = await Promise.all([
      supabase
        .from('inventory')
        .select('on_hand_quantity, reserved_quantity')
        .eq('product_id', productId),
      supabase
        .from('driver_inventory')
        .select('quantity')
        .eq('product_id', productId)
    ]);

    if (inventoryError) throw inventoryError;
    if (driverError) throw driverError;

    const locationTotal =
      balances?.reduce(
        (sum: number, row: { on_hand_quantity?: number | null; reserved_quantity?: number | null }) =>
          sum + (row.on_hand_quantity ?? 0) + (row.reserved_quantity ?? 0),
        0
      ) ?? 0;
    const driverTotal = driverBalances?.reduce((sum: number, row: { quantity: number }) => sum + row.quantity, 0) ?? 0;
    const total = locationTotal + driverTotal;

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
    from_location_id?: string | null;
    to_location_id?: string | null;
    reference_id?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<string> {
    const payload = {
      ...entry,
      created_by: this.userTelegramId,
      created_at: new Date().toISOString(),
      metadata: entry.metadata || {}
    };

    const { data, error } = await supabase.from('inventory_logs').insert(payload).select('id').single();
    if (error) throw error;

    return data.id;
  }

  private async recordSalesLog(entry: {
    product_id: string;
    location_id: string;
    quantity: number;
    total_amount: number;
    reference_id?: string | null;
    recorded_by?: string | null;
    sold_at?: string | null;
    notes?: string | null;
  }): Promise<string> {
    const payload = {
      ...entry,
      recorded_by: entry.recorded_by || this.userTelegramId,
      sold_at: entry.sold_at || new Date().toISOString(),
      notes: entry.notes ?? null
    };

    const { data, error } = await supabase.from('sales_logs').insert(payload).select('id').single();
    if (error) throw error;

    return data.id;
  }

  private async recordDriverMovement(entry: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string | null;
  }) {
    const payload = {
      driver_id: entry.driver_id,
      zone_id: entry.zone_id ?? null,
      product_id: entry.product_id ?? null,
      quantity_change: entry.quantity_change ?? null,
      action: entry.action,
      details: entry.details ?? null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('driver_movements').insert(payload);
    if (error) throw error;
  }

  private async getCentralLocationId(): Promise<string> {
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('code', 'CENTRAL')
      .maybeSingle();

    if (error) throw error;

    if (data?.id) {
      return data.id;
    }

    const { data: fallback, error: fallbackError } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('type', 'central')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;

    if (!fallback?.id) {
      throw new Error('לא נמצא מיקום מרכזי עבור המלאי');
    }

    return fallback.id;
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

    const zonesChannel = supabase.channel('zones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, (payload) => {
        this.notifyListeners('zones', payload);
      })
      .subscribe();

    this.subscriptions.set('zones', zonesChannel);

    const driverZonesChannel = supabase.channel('driver_zones')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_zones' }, (payload) => {
        this.notifyListeners('driver_zones', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_zones', driverZonesChannel);

    const driverStatusChannel = supabase.channel('driver_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_status' }, (payload) => {
        this.notifyListeners('driver_status', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_status', driverStatusChannel);

    const driverMovementsChannel = supabase.channel('driver_movements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_movements' }, (payload) => {
        this.notifyListeners('driver_movements', payload);
      })
      .subscribe();

    this.subscriptions.set('driver_movements', driverMovementsChannel);
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
    const centralLocationId = await this.getCentralLocationId();

    const { error: inventoryError } = await supabase
      .from('inventory')
      .upsert({
        product_id: data.id,
        location_id: centralLocationId,
        on_hand_quantity: input.stock_quantity ?? 0,
        reserved_quantity: 0,
        damaged_quantity: 0,
        low_stock_threshold: 10,
        updated_at: now
      });

    if (inventoryError) throw inventoryError;

    if ((input.stock_quantity ?? 0) !== 0) {
      await this.recordInventoryLog({
        product_id: data.id,
        change_type: 'restock',
        quantity_change: input.stock_quantity ?? 0,
        to_location_id: centralLocationId
      });
    }

    await this.refreshProductStock(data.id);

    return { id: data.id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    if (typeof updates.stock_quantity === 'number') {
      await this.refreshProductStock(id);
    }
  }

  // Inventory
  async listInventory(filters?: {
    product_id?: string;
    location_id?: string;
    location_ids?: string[];
  }): Promise<InventoryRecord[]> {
    let query = supabase
      .from('inventory')
      .select(
        `id, product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, updated_at,
         product:products(*),
         location:inventory_locations(*)`
      );

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.location_ids && filters.location_ids.length > 0) {
      query = query.in('location_id', filters.location_ids);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      on_hand_quantity: row.on_hand_quantity,
      reserved_quantity: row.reserved_quantity,
      damaged_quantity: row.damaged_quantity,
      low_stock_threshold: row.low_stock_threshold,
      updated_at: row.updated_at,
      product: row.product || undefined,
      location: row.location || undefined
    }));
  }

  async getInventory(productId: string, locationId?: string): Promise<InventoryRecord | null> {
    let query = supabase
      .from('inventory')
      .select(
        `id, product_id, location_id, on_hand_quantity, reserved_quantity, damaged_quantity, low_stock_threshold, updated_at,
         product:products(*),
         location:inventory_locations(*)`
      )
      .eq('product_id', productId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const record = data?.[0];
    if (!record) return null;

    return {
      id: record.id,
      product_id: record.product_id,
      location_id: record.location_id,
      on_hand_quantity: record.on_hand_quantity,
      reserved_quantity: record.reserved_quantity,
      damaged_quantity: record.damaged_quantity,
      low_stock_threshold: record.low_stock_threshold,
      updated_at: record.updated_at,
      product: record.product || undefined,
      location: record.location || undefined
    };
  }

  async listInventoryLocations(): Promise<InventoryLocation[]> {
    const { data, error } = await supabase
      .from('inventory_locations')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async listDriverInventory(filters?: {
    driver_id?: string;
    product_id?: string;
    driver_ids?: string[];
  }): Promise<DriverInventoryRecord[]> {
    let query = supabase
      .from('driver_inventory')
      .select('id, product_id, driver_id, quantity, location_id, updated_at, product:products(*), location:inventory_locations(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.driver_ids && filters.driver_ids.length > 0) {
      query = query.in('driver_id', filters.driver_ids);
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
      location_id: row.location_id,
      location: row.location || undefined,
      product: row.product || undefined
    }));
  }

  async listRestockRequests(filters?: {
    status?: RestockRequestStatus | 'all';
    onlyMine?: boolean;
    product_id?: string;
    location_id?: string;
  }): Promise<RestockRequest[]> {
    let query = supabase
      .from('restock_requests')
      .select(
        `*,
         product:products(*),
         from_location:inventory_locations!restock_requests_from_location_id_fkey(*),
         to_location:inventory_locations!restock_requests_to_location_id_fkey(*)`
      );

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.onlyMine) {
      query = query.eq('requested_by', this.userTelegramId);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('to_location_id', filters.location_id);
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
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      approved_by: row.approved_by,
      approved_quantity: row.approved_quantity,
      fulfilled_by: row.fulfilled_by,
      fulfilled_quantity: row.fulfilled_quantity,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      from_location: row.from_location || null,
      to_location: row.to_location || null,
      product: row.product || undefined
    }));
  }

  async submitRestockRequest(input: {
    product_id: string;
    requested_quantity: number;
    to_location_id: string;
    from_location_id?: string | null;
    notes?: string;
  }): Promise<{ id: string }> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_request_restock) {
      throw new Error('אין לך הרשאה לבקש חידוש מלאי');
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('restock_requests')
      .insert({
        product_id: input.product_id,
        requested_by: this.userTelegramId,
        requested_quantity: input.requested_quantity,
        to_location_id: input.to_location_id,
        from_location_id: input.from_location_id ?? null,
        status: 'pending',
        notes: input.notes || null,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (error) throw error;

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'reservation',
      quantity_change: input.requested_quantity,
      from_location_id: input.from_location_id ?? null,
      to_location_id: input.to_location_id,
      reference_id: data.id,
      metadata: { note: input.notes || null, event: 'restock_requested' }
    });

    return { id: data.id };
  }

  async approveRestockRequest(
    id: string,
    input: { approved_quantity: number; from_location_id: string; notes?: string }
  ): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_approve_restock) {
      throw new Error('אין לך הרשאה לאשר בקשות חידוש');
    }

    const { error } = await supabase.rpc('approve_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_from_location_id: input.from_location_id,
      p_approved_quantity: input.approved_quantity,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async fulfillRestockRequest(
    id: string,
    input: { fulfilled_quantity: number; notes?: string; reference_id?: string | null }
  ): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_fulfill_restock) {
      throw new Error('אין לך הרשאה לסמן אספקת חידוש');
    }

    const { error } = await supabase.rpc('fulfill_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_fulfilled_quantity: input.fulfilled_quantity,
      p_reference_id: input.reference_id ?? null,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async rejectRestockRequest(id: string, input?: { notes?: string }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_approve_restock) {
      throw new Error('אין לך הרשאה לדחות בקשות');
    }

    const { error } = await supabase.rpc('reject_restock_request', {
      p_request_id: id,
      p_actor: this.userTelegramId,
      p_notes: input?.notes || null
    });

    if (error) throw error;
  }

  async transferInventory(input: {
    product_id: string;
    from_location_id: string;
    to_location_id: string;
    quantity: number;
    notes?: string;
    reference_id?: string | null;
  }): Promise<void> {
    const { error } = await supabase.rpc('perform_inventory_transfer', {
      p_product_id: input.product_id,
      p_from_location_id: input.from_location_id,
      p_to_location_id: input.to_location_id,
      p_quantity: input.quantity,
      p_actor: this.userTelegramId,
      p_reference_id: input.reference_id ?? null,
      p_notes: input.notes || null
    });

    if (error) throw error;
  }

  async transferInventoryToDriver(input: {
    product_id: string;
    driver_id: string;
    quantity: number;
    notes?: string;
  }): Promise<void> {
    const permissions = await this.getRolePermissions();
    if (!permissions.can_transfer_inventory) {
      throw new Error('אין לך הרשאה להעביר מלאי לנהגים');
    }

    const centralLocationId = await this.getCentralLocationId();

    const { data: centralBalance, error: balanceError } = await supabase
      .from('inventory')
      .select('on_hand_quantity')
      .eq('product_id', input.product_id)
      .eq('location_id', centralLocationId)
      .maybeSingle();

    if (balanceError) throw balanceError;

    const available = centralBalance?.on_hand_quantity ?? 0;
    if (available < input.quantity) {
      throw new Error('אין מספיק מלאי במחסן המרכזי');
    }

    const now = new Date().toISOString();

    const { error: updateCentralError } = await supabase
      .from('inventory')
      .update({ on_hand_quantity: available - input.quantity, updated_at: now })
      .eq('product_id', input.product_id)
      .eq('location_id', centralLocationId);

    if (updateCentralError) throw updateCentralError;

    const { data: driverRow, error: driverError } = await supabase
      .from('driver_inventory')
      .select('id, quantity, location_id')
      .eq('driver_id', input.driver_id)
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (driverError) throw driverError;

    const driverQuantity = driverRow?.quantity ?? 0;
    const newQuantity = driverQuantity + input.quantity;

    const driverPayload = driverRow
      ? { quantity: newQuantity, updated_at: now }
      : {
          driver_id: input.driver_id,
          product_id: input.product_id,
          quantity: newQuantity,
          updated_at: now
        };

    const { error: driverUpsertError } = driverRow
      ? await supabase.from('driver_inventory').update(driverPayload).eq('id', driverRow.id)
      : await supabase.from('driver_inventory').insert(driverPayload);

    if (driverUpsertError) throw driverUpsertError;

    const driverLocationId = driverRow?.location_id ?? null;

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'transfer',
      quantity_change: -input.quantity,
      from_location_id: centralLocationId,
      to_location_id: driverLocationId,
      metadata: { target: 'driver', driver_id: input.driver_id, notes: input.notes || null, direction: 'outbound' }
    });

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'transfer',
      quantity_change: input.quantity,
      from_location_id: centralLocationId,
      to_location_id: driverLocationId,
      metadata: { target: 'driver', driver_id: input.driver_id, notes: input.notes || null, direction: 'inbound' }
    });

    await this.refreshProductStock(input.product_id);
  }

  async adjustDriverInventory(input: {
    driver_id: string;
    product_id: string;
    quantity_change: number;
    reason: string;
    notes?: string;
    zone_id?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from('driver_inventory')
      .select('id, quantity, location_id')
      .eq('driver_id', input.driver_id)
      .eq('product_id', input.product_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentQuantity = existing?.quantity ?? 0;
    const newQuantity = currentQuantity + input.quantity_change;

    if (newQuantity < 0) {
      throw new Error('לא ניתן להוריד את המלאי של הנהג מתחת לאפס');
    }

    const upsertPayload = existing
      ? { quantity: newQuantity, updated_at: now }
      : {
          driver_id: input.driver_id,
          product_id: input.product_id,
          quantity: newQuantity,
          updated_at: now
        };

    const { error: upsertError } = existing
      ? await supabase
          .from('driver_inventory')
          .update(upsertPayload)
          .eq('id', existing.id)
      : await supabase
          .from('driver_inventory')
          .insert(upsertPayload);

    if (upsertError) throw upsertError;

    const action: DriverMovementAction = input.quantity_change >= 0 ? 'inventory_added' : 'inventory_removed';
    const details = input.notes ? `${input.reason} - ${input.notes}` : input.reason;

    await this.recordDriverMovement({
      driver_id: input.driver_id,
      zone_id: input.zone_id ?? null,
      product_id: input.product_id,
      quantity_change: input.quantity_change,
      action,
      details
    });

    await this.recordInventoryLog({
      product_id: input.product_id,
      change_type: 'adjustment',
      quantity_change: input.quantity_change,
      from_location_id: existing?.location_id ?? null,
      to_location_id: existing?.location_id ?? null,
      metadata: { target: 'driver', driver_id: input.driver_id, reason: input.reason, notes: input.notes || null }
    });

    await this.refreshProductStock(input.product_id);
  }

  async listInventoryLogs(filters?: {
    product_id?: string;
    location_id?: string;
    limit?: number;
  }): Promise<InventoryLog[]> {
    let query = supabase
      .from('inventory_logs')
      .select(
        `id, product_id, change_type, quantity_change, from_location_id, to_location_id, reference_id, created_by, created_at, metadata,
         product:products(*),
         from_location:inventory_locations!inventory_logs_from_location_id_fkey(*),
         to_location:inventory_locations!inventory_logs_to_location_id_fkey(*)`
      );

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.or(`from_location_id.eq.${filters.location_id},to_location_id.eq.${filters.location_id}`);
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
      from_location_id: row.from_location_id,
      to_location_id: row.to_location_id,
      reference_id: row.reference_id,
      created_by: row.created_by,
      created_at: row.created_at,
      metadata: row.metadata,
      product: row.product || undefined,
      from_location: row.from_location || null,
      to_location: row.to_location || null
    }));
  }

  async listSalesLogs(filters?: { product_id?: string; location_id?: string; limit?: number }): Promise<SalesLog[]> {
    let query = supabase
      .from('sales_logs')
      .select('id, product_id, location_id, quantity, total_amount, reference_id, recorded_by, sold_at, notes, product:products(*), location:inventory_locations(*)');

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('sold_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      quantity: row.quantity,
      total_amount: Number(row.total_amount ?? 0),
      reference_id: row.reference_id,
      recorded_by: row.recorded_by,
      sold_at: row.sold_at,
      notes: row.notes || null,
      product: row.product || undefined,
      location: row.location || undefined
    }));
  }

  async getLowStockAlerts(filters?: { location_id?: string }): Promise<InventoryAlert[]> {
    let query = supabase.from('inventory_low_stock_alerts').select('*');

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      location_id: row.location_id,
      location_name: row.location_name,
      on_hand_quantity: row.on_hand_quantity,
      reserved_quantity: row.reserved_quantity,
      low_stock_threshold: row.low_stock_threshold,
      triggered_at: row.triggered_at
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

    const defaults: RolePermissions = {
      role: profile.role,
      can_view_inventory: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_request_restock: ['manager', 'warehouse', 'dispatcher', 'driver'].includes(profile.role),
      can_approve_restock: ['manager', 'warehouse'].includes(profile.role),
      can_fulfill_restock: ['manager', 'warehouse'].includes(profile.role),
      can_transfer_inventory: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_adjust_inventory: ['manager', 'warehouse'].includes(profile.role),
      can_view_movements: ['manager', 'warehouse', 'dispatcher'].includes(profile.role),
      can_manage_locations: profile.role === 'manager',
      can_view_sales: ['manager', 'sales'].includes(profile.role)
    };

    return defaults;
  }
  // Zones & Dispatch
  async listZones(): Promise<Zone[]> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getZone(id: string): Promise<Zone | null> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async listDriverZones(filters?: { driver_id?: string; zone_id?: string; activeOnly?: boolean }): Promise<DriverZoneAssignment[]> {
    let query = supabase
      .from('driver_zones')
      .select('*, zones(*)');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }

    if (filters?.activeOnly) {
      query = query.eq('active', true);
    }

    query = query.order('assigned_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      driver_id: row.driver_id,
      zone_id: row.zone_id,
      active: row.active,
      assigned_at: row.assigned_at,
      unassigned_at: row.unassigned_at,
      assigned_by: row.assigned_by,
      zone: row.zones || undefined
    }));
  }

  async assignDriverToZone(input: { zone_id: string; driver_id?: string; active?: boolean }): Promise<void> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = new Date().toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from('driver_zones')
      .select('id, active, assigned_at')
      .eq('driver_id', driverId)
      .eq('zone_id', input.zone_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const makeActive = input.active !== false;

    if (existing) {
      const updatePayload: any = { active: makeActive };
      if (makeActive) {
        updatePayload.assigned_at = now;
        updatePayload.unassigned_at = null;
      } else {
        updatePayload.unassigned_at = now;
      }

      const { error: updateError } = await supabase
        .from('driver_zones')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) throw updateError;
    } else if (makeActive) {
      const { error: insertError } = await supabase
        .from('driver_zones')
        .insert({
          driver_id: driverId,
          zone_id: input.zone_id,
          active: true,
          assigned_at: now,
          assigned_by: this.userTelegramId
        });

      if (insertError) throw insertError;
    } else {
      return;
    }

    await this.recordDriverMovement({
      driver_id: driverId,
      zone_id: input.zone_id,
      action: makeActive ? 'zone_joined' : 'zone_left',
      details: `Updated by ${this.userTelegramId}`
    });

    if (!makeActive) {
      const status = await this.getDriverStatus(driverId);
      if (status?.current_zone_id === input.zone_id) {
        await this.updateDriverStatus({
          driver_id: driverId,
          status: status.status,
          zone_id: null,
          is_online: status.is_online,
          note: status.note || undefined
        });
      }
    }
  }

  async updateDriverStatus(input: {
    status: DriverAvailabilityStatus;
    driver_id?: string;
    zone_id?: string | null;
    is_online?: boolean;
    note?: string;
  }): Promise<void> {
    const driverId = input.driver_id || this.userTelegramId;
    const now = new Date().toISOString();

    const payload: any = {
      driver_id: driverId,
      status: input.status,
      is_online: typeof input.is_online === 'boolean' ? input.is_online : input.status !== 'off_shift',
      note: input.note ?? null,
      last_updated: now
    };

    if (typeof input.zone_id !== 'undefined') {
      payload.current_zone_id = input.zone_id;
    }

    const { error } = await supabase
      .from('driver_status')
      .upsert(payload, { onConflict: 'driver_id' });

    if (error) throw error;

    await this.recordDriverMovement({
      driver_id: driverId,
      zone_id: input.zone_id ?? null,
      action: 'status_changed',
      details: `Status changed to ${input.status}`
    });
  }

  async getDriverStatus(driver_id?: string): Promise<DriverStatusRecord | null> {
    const targetDriver = driver_id || this.userTelegramId;

    const { data, error } = await supabase
      .from('driver_status')
      .select('*')
      .eq('driver_id', targetDriver)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let zone: Zone | undefined;
    if (data.current_zone_id) {
      const zoneData = await this.getZone(data.current_zone_id);
      if (zoneData) {
        zone = zoneData;
      }
    }

    return {
      driver_id: data.driver_id,
      status: data.status,
      is_online: data.is_online,
      current_zone_id: data.current_zone_id,
      last_updated: data.last_updated,
      note: data.note,
      zone
    };
  }

  async listDriverStatuses(filters?: { zone_id?: string; onlyOnline?: boolean }): Promise<DriverStatusRecord[]> {
    let query = supabase
      .from('driver_status')
      .select('*');

    if (filters?.zone_id) {
      query = query.eq('current_zone_id', filters.zone_id);
    }

    if (filters?.onlyOnline) {
      query = query.eq('is_online', true);
    }

    query = query.order('last_updated', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];
    const zoneIds = Array.from(
      new Set(
        rows
          .map((row: any) => row.current_zone_id as string | null)
          .filter((id): id is string => Boolean(id))
      )
    );

    let zoneMap = new Map<string, Zone>();
    if (zoneIds.length > 0) {
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .in('id', zoneIds);

      if (zoneError) throw zoneError;

      (zoneData || []).forEach((zone: Zone) => {
        zoneMap.set(zone.id, zone);
      });
    }

    return rows.map((row: any) => ({
      driver_id: row.driver_id,
      status: row.status,
      is_online: row.is_online,
      current_zone_id: row.current_zone_id,
      last_updated: row.last_updated,
      note: row.note,
      zone: row.current_zone_id ? zoneMap.get(row.current_zone_id) : undefined
    }));
  }

  async logDriverMovement(input: {
    driver_id: string;
    zone_id?: string | null;
    product_id?: string | null;
    quantity_change?: number | null;
    action: DriverMovementAction;
    details?: string;
  }): Promise<void> {
    await this.recordDriverMovement(input);
  }

  async listDriverMovements(filters?: { driver_id?: string; zone_id?: string; limit?: number }): Promise<DriverMovementLog[]> {
    let query = supabase
      .from('driver_movements')
      .select('*');

    if (filters?.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }

    if (filters?.zone_id) {
      query = query.eq('zone_id', filters.zone_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];
    const zoneIds = Array.from(new Set(rows.map((row: any) => row.zone_id as string | null).filter((id): id is string => Boolean(id))));
    const productIds = Array.from(new Set(rows.map((row: any) => row.product_id as string | null).filter((id): id is string => Boolean(id))));

    let zoneMap = new Map<string, Zone>();
    if (zoneIds.length > 0) {
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .in('id', zoneIds);

      if (zoneError) throw zoneError;

      (zoneData || []).forEach((zone: Zone) => {
        zoneMap.set(zone.id, zone);
      });
    }

    let productMap = new Map<string, Product>();
    if (productIds.length > 0) {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (productError) throw productError;

      (productData || []).forEach((product: Product) => {
        productMap.set(product.id, product);
      });
    }

    return rows.map((row: any) => ({
      id: row.id,
      driver_id: row.driver_id,
      zone_id: row.zone_id,
      product_id: row.product_id,
      quantity_change: row.quantity_change,
      action: row.action,
      details: row.details,
      created_at: row.created_at,
      zone: row.zone_id ? zoneMap.get(row.zone_id) : undefined,
      product: row.product_id ? productMap.get(row.product_id) : undefined
    }));
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

  async createOrder(input: CreateOrderInput): Promise<{ id: string }> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order must include at least one item');
    }

    const salespersonId = input.salesperson_id || this.userTelegramId;
    const status = input.status || 'new';
    const now = new Date().toISOString();
    const totalAmount = typeof input.total_amount === 'number'
      ? input.total_amount
      : input.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    const fallbackLocationId = await this.getCentralLocationId();

    interface InventorySnapshot {
      recordId: string;
      productId: string;
      locationId: string;
      previousOnHand: number;
      previousReserved: number;
      quantity: number;
      productName: string;
    }

    const validations: InventorySnapshot[] = [];

    for (const item of input.items) {
      const locationId = item.source_location || fallbackLocationId;

      if (!locationId) {
        throw new Error(`Missing inventory location for product ${item.product_name}`);
      }

      const { data: inventoryRecord, error: inventoryError } = await supabase
        .from('inventory')
        .select('id, on_hand_quantity, reserved_quantity')
        .eq('product_id', item.product_id)
        .eq('location_id', locationId)
        .maybeSingle();

      if (inventoryError) throw inventoryError;

      if (!inventoryRecord) {
        throw new Error(`Inventory record not found for ${item.product_name} at location ${locationId}`);
      }

      const onHand = inventoryRecord.on_hand_quantity ?? 0;
      const reservedQuantity = inventoryRecord.reserved_quantity ?? 0;

      if (onHand < item.quantity) {
        throw new Error(`Insufficient inventory for ${item.product_name} at location ${locationId}`);
      }

      validations.push({
        recordId: inventoryRecord.id,
        productId: item.product_id,
        locationId,
        previousOnHand: onHand,
        previousReserved: reservedQuantity,
        quantity: item.quantity,
        productName: item.product_name
      });
    }

    const payload = {
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_address: input.customer_address,
      notes: input.notes || null,
      delivery_date: input.delivery_date || null,
      status,
      items: input.items,
      total_amount: totalAmount,
      entry_mode: input.entry_mode,
      raw_order_text: input.raw_order_text || null,
      created_by: this.userTelegramId,
      salesperson_id: salespersonId,
      created_at: now,
      updated_at: now
    };

    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .insert(payload)
      .select('id')
      .single();

    if (orderError) throw orderError;

    const orderId = orderRow.id;
    const processedAdjustments: InventorySnapshot[] = [];
    const inventoryLogs: string[] = [];
    const salesLogs: string[] = [];
    const productsToRefresh = new Set<string>();

    try {
      for (let index = 0; index < input.items.length; index += 1) {
        const item = input.items[index];
        const snapshot = validations[index];

        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            on_hand_quantity: snapshot.previousOnHand - snapshot.quantity,
            reserved_quantity: snapshot.previousReserved + snapshot.quantity,
            updated_at: now
          })
          .eq('id', snapshot.recordId);

        if (updateError) {
          throw updateError;
        }

        processedAdjustments.push(snapshot);

        const logId = await this.recordInventoryLog({
          product_id: snapshot.productId,
          change_type: 'reservation',
          quantity_change: -snapshot.quantity,
          from_location_id: snapshot.locationId,
          to_location_id: snapshot.locationId,
          reference_id: orderId,
          metadata: {
            entry_mode: input.entry_mode,
            salesperson_id: salespersonId,
            source_location: snapshot.locationId
          }
        });

        inventoryLogs.push(logId);

        const salesLogId = await this.recordSalesLog({
          product_id: snapshot.productId,
          location_id: snapshot.locationId,
          quantity: snapshot.quantity,
          total_amount: (item.price || 0) * snapshot.quantity,
          reference_id: orderId,
          recorded_by: salespersonId,
          sold_at: now,
          notes: `Order entry via ${input.entry_mode}`
        });

        salesLogs.push(salesLogId);
        productsToRefresh.add(snapshot.productId);
      }

      for (const productId of productsToRefresh) {
        await this.refreshProductStock(productId);
      }
    } catch (error) {
      // Attempt rollback for partial failures
      if (processedAdjustments.length > 0) {
        await Promise.all(
          processedAdjustments.reverse().map((adjustment) =>
            supabase
              .from('inventory')
              .update({
                on_hand_quantity: adjustment.previousOnHand,
                reserved_quantity: adjustment.previousReserved,
                updated_at: new Date().toISOString()
              })
              .eq('id', adjustment.recordId)
          )
        );
      }

      if (inventoryLogs.length > 0) {
        await supabase.from('inventory_logs').delete().in('id', inventoryLogs);
      }

      if (salesLogs.length > 0) {
        await supabase.from('sales_logs').delete().in('id', salesLogs);
      }

      await supabase.from('orders').delete().eq('id', orderId);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create order');
    }

    return { id: orderId };
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

  async getManagerDashboardSnapshot(): Promise<ManagerDashboardSnapshot> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const previousDayStart = new Date(startOfDay);
    previousDayStart.setDate(previousDayStart.getDate() - 1);

    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const toIso = (date: Date) => date.toISOString();

    const [ordersTodayResult, ordersYesterdayResult, ordersTrendResult, openOrdersResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total_amount, status, created_at, items, assigned_driver')
        .gte('created_at', toIso(startOfDay))
        .lte('created_at', toIso(now)),
      supabase
        .from('orders')
        .select('id, total_amount, status, created_at, items')
        .gte('created_at', toIso(previousDayStart))
        .lt('created_at', toIso(startOfDay)),
      supabase
        .from('orders')
        .select('id, total_amount, status, created_at, items, assigned_driver')
        .gte('created_at', toIso(startOfWeek))
        .lte('created_at', toIso(now)),
      supabase
        .from('orders')
        .select('id, status, assigned_driver, created_at')
        .in('status', ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'])
    ]);

    if (ordersTodayResult.error) throw ordersTodayResult.error;
    if (ordersYesterdayResult.error) throw ordersYesterdayResult.error;
    if (ordersTrendResult.error) throw ordersTrendResult.error;
    if (openOrdersResult.error) throw openOrdersResult.error;

    const ordersToday = ordersTodayResult.data || [];
    const ordersYesterday = ordersYesterdayResult.data || [];
    const ordersTrend = ordersTrendResult.data || [];
    const openOrders = openOrdersResult.data || [];

    const parseItems = (order: any) => {
      if (!order) return [] as any[];
      if (Array.isArray(order.items)) return order.items as any[];
      if (typeof order.items === 'string') {
        try {
          const parsed = JSON.parse(order.items);
          return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.warn('Failed to parse order items JSON', error);
          return [];
        }
      }
      return [] as any[];
    };

    const getActiveOrders = (collection: any[]) =>
      collection.filter(order => order.status !== 'cancelled');

    const getVolume = (collection: any[]) =>
      collection.reduce((sum, order) => {
        return sum + parseItems(order).reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
      }, 0);

    const summarizeValue = (collection: any[]) =>
      collection.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    const computeChange = (todayValue: number, previousValue: number) => {
      if (previousValue === 0) {
        return todayValue > 0 ? 100 : 0;
      }
      return ((todayValue - previousValue) / previousValue) * 100;
    };

    const todaysOrders = getActiveOrders(ordersToday);
    const yesterdaysOrders = getActiveOrders(ordersYesterday);

    const revenueToday = summarizeValue(todaysOrders);
    const revenueYesterday = summarizeValue(yesterdaysOrders);
    const ordersTodayCount = todaysOrders.length;
    const ordersYesterdayCount = yesterdaysOrders.length;
    const volumeToday = getVolume(todaysOrders);
    const volumeYesterday = getVolume(yesterdaysOrders);
    const averageOrderValue = ordersTodayCount > 0 ? revenueToday / ordersTodayCount : 0;

    const revenueChange = computeChange(revenueToday, revenueYesterday);
    const ordersChange = computeChange(ordersTodayCount, ordersYesterdayCount);

    const [driverStatuses, activeAssignments, zones, lowStockAlerts, restockQueueAll] = await Promise.all([
      this.listDriverStatuses(),
      this.listDriverZones({ activeOnly: true }),
      this.listZones(),
      this.getLowStockAlerts(),
      this.listRestockRequests({ status: 'all' })
    ]);

    const statusMap = new Map<string, DriverStatusRecord>();
    (driverStatuses || []).forEach(status => statusMap.set(status.driver_id, status));

    const activeDriverSet = new Set<string>();
    (driverStatuses || []).forEach(status => {
      if (status.is_online && status.status !== 'off_shift') {
        activeDriverSet.add(status.driver_id);
      }
    });

    const totalDrivers = driverStatuses?.length || 0;
    const activeDrivers = activeDriverSet.size;
    const onlineRatio = totalDrivers > 0 ? activeDrivers / totalDrivers : 0;

    const assignmentMap = new Map<string, Set<string>>();
    (activeAssignments || []).forEach(assignment => {
      if (!assignment.active) return;
      if (!assignmentMap.has(assignment.zone_id)) {
        assignmentMap.set(assignment.zone_id, new Set());
      }
      assignmentMap.get(assignment.zone_id)!.add(assignment.driver_id);
    });

    const activeZoneMap = new Map<string, Set<string>>();
    (driverStatuses || []).forEach(status => {
      if (!status.is_online || status.status === 'off_shift') {
        return;
      }

      const fallbackAssignment = (activeAssignments || []).find(assignment => assignment.driver_id === status.driver_id);
      const resolvedZone = status.current_zone_id || fallbackAssignment?.zone_id;
      if (!resolvedZone) return;

      if (!activeZoneMap.has(resolvedZone)) {
        activeZoneMap.set(resolvedZone, new Set());
      }
      activeZoneMap.get(resolvedZone)!.add(status.driver_id);
    });

    const openOrderMap = new Map<string, number>();
    let unassignedOrders = 0;
    openOrders.forEach(order => {
      const driverId = order.assigned_driver as string | null;
      if (driverId) {
        const status = statusMap.get(driverId);
        const fallbackAssignment = (activeAssignments || []).find(assignment => assignment.driver_id === driverId);
        const zoneId = status?.current_zone_id || fallbackAssignment?.zone_id;
        if (zoneId) {
          openOrderMap.set(zoneId, (openOrderMap.get(zoneId) || 0) + 1);
        } else {
          unassignedOrders += 1;
        }
      } else {
        unassignedOrders += 1;
      }
    });

    const zoneSnapshots: ZoneCoverageSnapshot[] = (zones || []).map(zone => {
      const assignedDrivers = assignmentMap.get(zone.id) || new Set();
      const activeDriversSet = activeZoneMap.get(zone.id) || new Set();
      const coverage = assignedDrivers.size === 0
        ? (activeDriversSet.size > 0 ? 100 : 0)
        : Math.round((activeDriversSet.size / assignedDrivers.size) * 100);

      return {
        zone_id: zone.id,
        zone_name: zone.name,
        coverage_percent: coverage,
        active_drivers: activeDriversSet.size,
        assigned_drivers: assignedDrivers.size,
        open_orders: openOrderMap.get(zone.id) || 0,
        unassigned_orders: 0
      };
    });

    if (unassignedOrders > 0) {
      zoneSnapshots.push({
        zone_id: 'unassigned',
        zone_name: 'ללא שיוך',
        coverage_percent: 0,
        active_drivers: 0,
        assigned_drivers: 0,
        open_orders: unassignedOrders,
        unassigned_orders: unassignedOrders
      });
    }

    const baseZoneCount = zoneSnapshots.filter(zone => zone.zone_id !== 'unassigned').length;
    const zoneCoverageAverage = baseZoneCount > 0
      ? zoneSnapshots
          .filter(zone => zone.zone_id !== 'unassigned')
          .reduce((sum, zone) => sum + zone.coverage_percent, 0) / baseZoneCount
      : (activeDrivers > 0 ? 100 : 0);

    const currentHour = now.getHours();
    const hourlyBuckets = new Map<string, { orders: number; revenue: number; volume: number }>();
    todaysOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const hourLabel = `${orderDate.getHours().toString().padStart(2, '0')}:00`;
      if (!hourlyBuckets.has(hourLabel)) {
        hourlyBuckets.set(hourLabel, { orders: 0, revenue: 0, volume: 0 });
      }
      const bucket = hourlyBuckets.get(hourLabel)!;
      bucket.orders += 1;
      bucket.revenue += Number(order.total_amount || 0);
      bucket.volume += parseItems(order).reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
    });

    const hourly: DashboardHourlyPoint[] = [];
    for (let hour = 0; hour <= currentHour; hour += 1) {
      const label = `${hour.toString().padStart(2, '0')}:00`;
      const bucket = hourlyBuckets.get(label) || { orders: 0, revenue: 0, volume: 0 };
      hourly.push({
        hour: label,
        orders: bucket.orders,
        revenue: bucket.revenue,
        volume: bucket.volume
      });
    }

    const trendBuckets = new Map<string, { orders: number; revenue: number; volume: number }>();
    const iterateDate = new Date(startOfWeek);
    while (iterateDate <= now) {
      const key = iterateDate.toISOString().slice(0, 10);
      trendBuckets.set(key, { orders: 0, revenue: 0, volume: 0 });
      iterateDate.setDate(iterateDate.getDate() + 1);
    }

    ordersTrend.forEach(order => {
      const key = new Date(order.created_at).toISOString().slice(0, 10);
      if (!trendBuckets.has(key)) {
        trendBuckets.set(key, { orders: 0, revenue: 0, volume: 0 });
      }
      const bucket = trendBuckets.get(key)!;
      bucket.orders += order.status === 'cancelled' ? 0 : 1;
      bucket.revenue += order.status === 'cancelled' ? 0 : Number(order.total_amount || 0);
      if (order.status !== 'cancelled') {
        bucket.volume += parseItems(order).reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
      }
    });

    const trend: DashboardDailyPoint[] = Array.from(trendBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, bucket]) => ({
        date,
        orders: bucket.orders,
        revenue: bucket.revenue,
        volume: bucket.volume
      }));

    const actionableRestock = (restockQueueAll || []).filter(request =>
      ['pending', 'approved', 'in_transit'].includes(request.status)
    );

    return {
      generated_at: now.toISOString(),
      metrics: {
        revenue_today: revenueToday,
        revenue_change: revenueChange,
        orders_today: ordersTodayCount,
        orders_change: ordersChange,
        average_order_value: averageOrderValue,
        volume_today: volumeToday,
        active_drivers: activeDrivers,
        total_drivers: totalDrivers,
        online_ratio: onlineRatio,
        zone_coverage: Math.round(zoneCoverageAverage),
        low_stock_count: lowStockAlerts?.length || 0,
        restock_pending: actionableRestock.length
      },
      hourly,
      trend,
      zone_coverage: zoneSnapshots,
      low_stock_alerts: (lowStockAlerts || []).slice(0, 8),
      restock_requests: actionableRestock.slice(0, 8)
    };
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