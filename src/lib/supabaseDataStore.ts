import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { DataStore, User, Order, Task, Product, Route, GroupChat, Channel, Notification, BootstrapConfig } from '../../data/types';

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
    return { id: data.id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
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