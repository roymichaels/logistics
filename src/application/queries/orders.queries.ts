import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface Order {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  items: any[];
  total_amount: number;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  driver_id?: string;
  created_at: string;
  updated_at: string;
}

export class OrderQueries {
  constructor(private dataStore: IDataStore) {}

  async getOrders(filters?: {
    business_id?: string;
    status?: string;
    driver_id?: string;
  }): AsyncResult<Order[], ClassifiedError> {
    try {
      logger.info('[OrderQueries] Fetching orders', { filters });

      let query = this.dataStore.from('orders').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        logger.error('[OrderQueries] Failed to fetch orders', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch orders',
          code: 'ORDER_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Order[]);
    } catch (error: any) {
      logger.error('[OrderQueries] Exception fetching orders', error);
      return Err({
        message: error.message || 'Unexpected error fetching orders',
        code: 'ORDER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getOrderById(orderId: string): AsyncResult<Order | null, ClassifiedError> {
    try {
      logger.info('[OrderQueries] Fetching order by ID', { orderId });

      const result = await this.dataStore
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (!result.success) {
        logger.error('[OrderQueries] Failed to fetch order', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch order',
          code: 'ORDER_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as Order | null);
    } catch (error: any) {
      logger.error('[OrderQueries] Exception fetching order', error);
      return Err({
        message: error.message || 'Unexpected error fetching order',
        code: 'ORDER_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getOrderStats(businessId?: string): AsyncResult<{
    total: number;
    pending: number;
    assigned: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
  }, ClassifiedError> {
    try {
      logger.info('[OrderQueries] Fetching order stats', { businessId });

      let query = this.dataStore.from('orders').select('status');

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const result = await query;

      if (!result.success) {
        return Err({
          message: 'Failed to fetch order statistics',
          code: 'ORDER_STATS_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
        });
      }

      const orders = result.data as Array<{ status: string }>;
      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        assigned: orders.filter(o => o.status === 'assigned').length,
        in_transit: orders.filter(o => o.status === 'in_transit').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
      };

      return Ok(stats);
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to calculate order stats',
        code: 'ORDER_STATS_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
