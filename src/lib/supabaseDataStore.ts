import { supabase } from './supabase';
import { logger } from './logger';
import type { DataStore, User, Product, InventoryRecord, Zone } from '../data/types';
import { ensureUserProfile } from './auth/unifiedAuth';

export class SupabaseDataStore implements Partial<DataStore> {
  private userId: string;
  private businessId?: string;

  constructor(userId: string, businessId?: string) {
    this.userId = userId;
    this.businessId = businessId;
    logger.info('[SupabaseDataStore] Initialized', { userId, businessId });
  }

  async getProfile(): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', this.userId)
      .maybeSingle();

    if (error) {
      logger.error('[SupabaseDataStore] Failed to fetch profile', error);
      throw error;
    }

    if (!data) {
      throw new Error('Profile not found');
    }

    return {
      id: data.id,
      role: data.role,
      name: data.name,
      username: data.username,
      bio: data.bio,
      location: data.location,
      website: data.website,
      phone: data.phone,
      wallet_address: data.wallet_address,
      wallet_type: data.wallet_type,
      photo_url: data.photo_url || data.avatar_url,
      avatar_url: data.avatar_url,
    } as User;
  }

  async getCurrentRole(): Promise<User['role'] | null> {
    const profile = await this.getProfile();
    return profile.role;
  }

  async updateProfile(updates: Partial<User>): Promise<void> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are provided
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.photo_url !== undefined) {
      updateData.photo_url = updates.photo_url;
      updateData.avatar_url = updates.photo_url; // Keep in sync
    }
    if (updates.avatar_url !== undefined) {
      updateData.avatar_url = updates.avatar_url;
      updateData.photo_url = updates.avatar_url; // Keep in sync
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', (updates as any).id || this.userId);

    if (error) {
      logger.error('[SupabaseDataStore] Failed to update profile', error);
      throw error;
    }

    logger.info('[SupabaseDataStore] Profile updated successfully');
  }

  async listProducts(filters?: { category?: string; q?: string }): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*, category:product_categories(id, name)')
      .eq('status', 'active');

    if (this.businessId) {
      query = query.eq('business_id', this.businessId);
    }

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }

    if (filters?.q) {
      query = query.or(`name.ilike.%${filters.q}%,description.ilike.%${filters.q}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[SupabaseDataStore] Failed to list products', error);
      throw error;
    }

    return (data || []).map(p => ({
      id: p.id,
      business_id: p.business_id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      sku: p.sku,
      image_url: p.image_url,
      category_id: p.category_id,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })) as Product[];
  }

  async getProduct(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:product_categories(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('[SupabaseDataStore] Failed to fetch product', error);
      throw error;
    }

    if (!data) {
      throw new Error('Product not found');
    }

    return {
      id: data.id,
      business_id: data.business_id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      sku: data.sku,
      image_url: data.image_url,
      category_id: data.category_id,
      status: data.status,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Product;
  }

  async createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: string }> {
    if (!this.businessId) {
      throw new Error('Business context required to create product');
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: this.businessId,
        name: input.name,
        description: input.description,
        price: input.price,
        sku: input.sku,
        image_url: input.image_url,
        category_id: input.category_id,
        status: input.status || 'active',
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[SupabaseDataStore] Failed to create product', error);
      throw error;
    }

    return { id: data.id };
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        sku: updates.sku,
        image_url: updates.image_url,
        category_id: updates.category_id,
        status: updates.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('[SupabaseDataStore] Failed to update product', error);
      throw error;
    }
  }

  async listInventory(filters?: { product_id?: string; location_id?: string; location_ids?: string[] }): Promise<InventoryRecord[]> {
    let query = supabase
      .from('inventory')
      .select('*, product:products(id, name, sku), location:inventory_locations(id, name)');

    if (this.businessId) {
      query = query.eq('business_id', this.businessId);
    }

    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }

    if (filters?.location_id) {
      query = query.eq('location_id', filters.location_id);
    }

    if (filters?.location_ids && filters.location_ids.length > 0) {
      query = query.in('location_id', filters.location_ids);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[SupabaseDataStore] Failed to list inventory', error);
      throw error;
    }

    return (data || []).map(i => ({
      id: i.id,
      product_id: i.product_id,
      location_id: i.location_id,
      quantity_on_hand: i.quantity_on_hand,
      quantity_reserved: i.quantity_reserved,
      quantity_available: i.quantity_available,
      product: i.product,
      location: i.location,
    })) as InventoryRecord[];
  }

  async listZones(filters?: { business_id?: string; city?: string; region?: string }): Promise<Zone[]> {
    let query = supabase
      .from('zones')
      .select('*')
      .eq('active', true);

    if (filters?.business_id) {
      query = query.eq('business_id', filters.business_id);
    } else if (this.businessId) {
      query = query.eq('business_id', this.businessId);
    }

    if (filters?.city) {
      query = query.eq('city', filters.city);
    }

    if (filters?.region) {
      query = query.eq('region', filters.region);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[SupabaseDataStore] Failed to list zones', error);
      throw error;
    }

    return (data || []).map(z => ({
      id: z.id,
      name: z.name,
      code: z.code,
      description: z.description,
      color: z.color,
      city: z.city,
      region: z.region,
      polygon: z.polygon,
      active: z.active,
      business_id: z.business_id,
      metadata: z.metadata,
      created_at: z.created_at,
      updated_at: z.updated_at,
    })) as Zone[];
  }

  async getZone(id: string): Promise<Zone | null> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('[SupabaseDataStore] Failed to fetch zone', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      color: data.color,
      city: data.city,
      region: data.region,
      polygon: data.polygon,
      active: data.active,
      business_id: data.business_id,
      metadata: data.metadata,
      created_at: data.created_at,
      updated_at: data.updated_at,
    } as Zone;
  }

  async createBusiness(input: any): Promise<any> {
    logger.info('[SupabaseDataStore] Creating business', { input });

    if (!this.userId) {
      const errorMsg = 'User ID is required to create a business';
      logger.error('[SupabaseDataStore]', errorMsg);
      throw new Error(errorMsg);
    }

    const profileExists = await ensureUserProfile(this.userId, input.wallet_type);
    if (!profileExists) {
      const errorMsg = 'Failed to create or verify user profile';
      logger.error('[SupabaseDataStore]', errorMsg);
      throw new Error(errorMsg);
    }

    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 9);

    const newBusiness = {
      owner_id: this.userId,
      name: input.name,
      name_hebrew: input.name_hebrew,
      slug,
      description: input.description,
      business_type: input.business_type || 'retail',
      status: 'active',
      order_number_prefix: input.order_number_prefix || 'ORD',
      default_currency: input.default_currency || 'USD',
      primary_color: input.primary_color || '#1e40af',
      secondary_color: input.secondary_color || '#3b82f6',
      settings: {},
    };

    logger.debug('[SupabaseDataStore] Inserting business:', { name: newBusiness.name, owner_id: newBusiness.owner_id });

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert(newBusiness)
      .select()
      .single();

    if (businessError) {
      logger.error('[SupabaseDataStore] Failed to create business:', {
        error: businessError,
        message: businessError.message,
        code: businessError.code,
        details: businessError.details
      });

      if (businessError.code === 'PGRST301' || businessError.message?.includes('JWT')) {
        throw new Error('Authentication error. Please reconnect your wallet and try again.');
      } else if (businessError.code === '42501' || businessError.message?.includes('permission')) {
        throw new Error('Permission denied. Please ensure you have the necessary permissions to create a business.');
      } else {
        throw new Error(`Failed to create business: ${businessError.message || 'Unknown error'}`);
      }
    }

    logger.info('[SupabaseDataStore] Business created successfully', { businessId: business.id });

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'business_owner' })
      .eq('id', this.userId)
      .eq('role', 'customer');

    if (profileError) {
      logger.warn('[SupabaseDataStore] Failed to update user role (non-critical):', profileError);
    }

    return business;
  }

  clearUserCache(): void {
    logger.debug('[SupabaseDataStore] Cache cleared');
  }
}

export async function createSupabaseDataStore(
  userId: string,
  authSession?: any,
  user?: any
): Promise<Partial<DataStore>> {
  const businessId = user?.business_id;
  return new SupabaseDataStore(userId, businessId);
}

export default {
  createSupabaseDataStore,
};
