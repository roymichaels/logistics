import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

/**
 * Data Access Service
 *
 * Centralized service for all Supabase database operations.
 * Provides a clean abstraction layer for data access with consistent error handling and logging.
 *
 * Per the canonical knowledgebase:
 * - UI never talks directly to infrastructure
 * - All data access goes through this service layer
 * - Supports future backend swapping (e.g., SxT) without UI changes
 */

export interface QueryResult<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

class DataAccessService {
  /**
   * Products
   */
  async getProducts(businessId: string, filters?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<QueryResult<any[]>> {
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null, count: count || undefined };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get products', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch products' };
    }
  }

  async getProduct(productId: string): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get product', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch product' };
    }
  }

  /**
   * Orders
   */
  async getOrders(businessId: string, filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<QueryResult<any[]>> {
    try {
      let query = supabase
        .from('orders')
        .select('*, profiles!orders_customer_id_fkey(name, email)', { count: 'exact' })
        .eq('business_id', businessId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error, count } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null, count: count || undefined };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get orders', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch orders' };
    }
  }

  async getOrder(orderId: string): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, image_url)), profiles!orders_customer_id_fkey(name, email, phone)')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get order', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch order' };
    }
  }

  async createOrder(orderData: any): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      logger.info('[DataAccessService] Order created', { orderId: data.id });
      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to create order', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to create order' };
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      logger.info('[DataAccessService] Order status updated', { orderId, status });
      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to update order status', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to update order' };
    }
  }

  /**
   * Inventory
   */
  async getInventoryItems(businessId: string): Promise<QueryResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, products(name, sku)')
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get inventory', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch inventory' };
    }
  }

  async updateInventoryLevel(inventoryId: string, quantity: number): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update({ quantity_available: quantity, updated_at: new Date().toISOString() })
        .eq('id', inventoryId)
        .select()
        .single();

      if (error) throw error;

      logger.info('[DataAccessService] Inventory updated', { inventoryId, quantity });
      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to update inventory', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to update inventory' };
    }
  }

  /**
   * Drivers
   */
  async getDrivers(businessId: string): Promise<QueryResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*, profiles(name, email, phone)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get drivers', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch drivers' };
    }
  }

  async getDriverAssignments(driverId: string): Promise<QueryResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('driver_assignments')
        .select('*, orders(*)')
        .eq('driver_id', driverId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get driver assignments', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch assignments' };
    }
  }

  async assignDriver(orderId: string, driverId: string): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('driver_assignments')
        .insert({
          order_id: orderId,
          driver_id: driverId,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('orders')
        .update({ driver_id: driverId, status: 'assigned' })
        .eq('id', orderId);

      logger.info('[DataAccessService] Driver assigned', { orderId, driverId });
      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to assign driver', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to assign driver' };
    }
  }

  /**
   * Business
   */
  async getBusiness(businessId: string): Promise<QueryResult<any>> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get business', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch business' };
    }
  }

  async getBusinessesForOwner(ownerId: string): Promise<QueryResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get businesses for owner', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch businesses' };
    }
  }

  /**
   * Analytics
   */
  async getBusinessMetrics(businessId: string, dateFrom?: string, dateTo?: string): Promise<QueryResult<any>> {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .eq('business_id', businessId)
        .gte('created_at', dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('created_at', dateTo || new Date().toISOString());

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const pendingOrders = orders?.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length || 0;

      const metrics = {
        totalRevenue,
        totalOrders,
        completedOrders,
        pendingOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      };

      return { data: metrics, error: null };
    } catch (error) {
      logger.error('[DataAccessService] Failed to get business metrics', error);
      return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch metrics' };
    }
  }
}

export const dataAccessService = new DataAccessService();
