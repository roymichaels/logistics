import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export interface CreateOrderInput {
  business_id: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
  total_amount: number;
}

export interface AssignOrderInput {
  order_id: string;
  driver_id: string;
}

export class OrderCommands {
  constructor(private dataStore: IDataStore) {}

  async createOrder(input: CreateOrderInput): AsyncResult<{ id: string }, ClassifiedError> {
    try {
      logger.info('[OrderCommands] Creating order', { input });

      const result = await this.dataStore
        .from('orders')
        .insert({
          business_id: input.business_id,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          delivery_address: input.delivery_address,
          items: input.items,
          total_amount: input.total_amount,
          status: 'pending',
        })
        .select('id')
        .single();

      if (!result.success) {
        logger.error('[OrderCommands] Failed to create order', result.error);
        return Err({
          message: result.error.message || 'Failed to create order',
          code: 'ORDER_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const orderId = result.data.id;

      DomainEvents.emit({
        type: 'order.created',
        payload: { orderId, businessId: input.business_id },
        timestamp: Date.now(),
      });

      logger.info('[OrderCommands] Order created successfully', { orderId });

      return Ok({ id: orderId });
    } catch (error: any) {
      logger.error('[OrderCommands] Exception creating order', error);
      return Err({
        message: error.message || 'Unexpected error creating order',
        code: 'ORDER_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async assignOrder(input: AssignOrderInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[OrderCommands] Assigning order', { input });

      const result = await this.dataStore
        .from('orders')
        .update({
          driver_id: input.driver_id,
          status: 'assigned',
        })
        .eq('id', input.order_id);

      if (!result.success) {
        logger.error('[OrderCommands] Failed to assign order', result.error);
        return Err({
          message: result.error.message || 'Failed to assign order',
          code: 'ORDER_ASSIGN_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'order.assigned',
        payload: { orderId: input.order_id, driverId: input.driver_id },
        timestamp: Date.now(),
      });

      logger.info('[OrderCommands] Order assigned successfully', input);

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[OrderCommands] Exception assigning order', error);
      return Err({
        message: error.message || 'Unexpected error assigning order',
        code: 'ORDER_ASSIGN_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[OrderCommands] Updating order status', { orderId, status });

      const result = await this.dataStore
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (!result.success) {
        logger.error('[OrderCommands] Failed to update order status', result.error);
        return Err({
          message: result.error.message || 'Failed to update order status',
          code: 'ORDER_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'order.status_updated',
        payload: { orderId, status },
        timestamp: Date.now(),
      });

      logger.info('[OrderCommands] Order status updated successfully', { orderId, status });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[OrderCommands] Exception updating order status', error);
      return Err({
        message: error.message || 'Unexpected error updating order status',
        code: 'ORDER_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async cancelOrder(orderId: string, reason?: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[OrderCommands] Cancelling order', { orderId, reason });

      const result = await this.dataStore
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
        })
        .eq('id', orderId);

      if (!result.success) {
        logger.error('[OrderCommands] Failed to cancel order', result.error);
        return Err({
          message: result.error.message || 'Failed to cancel order',
          code: 'ORDER_CANCEL_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'order.cancelled',
        payload: { orderId, reason },
        timestamp: Date.now(),
      });

      logger.info('[OrderCommands] Order cancelled successfully', { orderId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[OrderCommands] Exception cancelling order', error);
      return Err({
        message: error.message || 'Unexpected error cancelling order',
        code: 'ORDER_CANCEL_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
