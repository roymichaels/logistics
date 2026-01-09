import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface Order {
  id: string;
  business_id: string;
  customer_id: string;
  order_number: string;
  status: string;
  payment_status: string;
  delivery_address_id?: string;
  delivery_address?: any;
  delivery_zone_id?: string;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  discount: number;
  total: number;
  currency: string;
  payment_method?: string;
  notes?: string;
  customer_notes?: string;
  estimated_delivery_at?: string;
  confirmed_at?: string;
  prepared_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export class OrderQueries {
  constructor(private dataStore: IDataStore) {}

  async getOrders(filters?: {
    business_id?: string;
    status?: string;
    customer_id?: string;
  }): AsyncResult<Order[], ClassifiedError> {
    try {
      logger.info('[OrderQueries] Fetching orders', { filters });

      let query = this.dataStore.from('orders').select(
        'id, business_id, customer_id, order_number, status, payment_status, delivery_address_id, delivery_address, delivery_zone_id, subtotal, tax, delivery_fee, discount, total, currency, payment_method, notes, customer_notes, estimated_delivery_at, confirmed_at, prepared_at, picked_up_at, delivered_at, cancelled_at, cancellation_reason, metadata, created_at, updated_at'
      );

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
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
    confirmed: number;
    preparing: number;
    ready: number;
    assigned: number;
    picked_up: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
    failed: number;
  }, ClassifiedError> {
    try {
      logger.info('[OrderQueries] Fetching order stats', { businessId });

      let query = this.dataStore.from('orders').select('id, status');

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
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        assigned: orders.filter(o => o.status === 'assigned').length,
        picked_up: orders.filter(o => o.status === 'picked_up').length,
        in_transit: orders.filter(o => o.status === 'in_transit').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        failed: orders.filter(o => o.status === 'failed').length,
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
