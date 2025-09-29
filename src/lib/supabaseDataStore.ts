import { createClient } from '@supabase/supabase-js';
import { DataStore, User, Order, Task, Product, Route, GroupChat, Channel, Notification, BootstrapConfig } from '../../data/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseDataStore implements DataStore {
  private user: User | null = null;

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

  // Orders
  async listOrders(filters?: { status?: string; q?: string }): Promise<Order[]> {
    let query = supabase.from('orders').select('*');

    // Apply role-based filtering
    const profile = await this.getProfile();
    if (profile.role === 'sales') {
      query = query.eq('created_by', this.userTelegramId);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.q) {
      query = query.or(`customer_name.ilike.%${filters.q}%,customer_phone.ilike.%${filters.q}%,customer_address.ilike.%${filters.q}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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
}

export function createSupabaseDataStore(userTelegramId: string, authToken?: string): DataStore {
  return new SupabaseDataStore(userTelegramId, authToken);
}