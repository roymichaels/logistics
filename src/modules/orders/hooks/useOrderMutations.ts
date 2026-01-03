import { useState, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { Order, OrderStatus } from '@domain/orders/entities';
import {
  CreateOrderOptions,
  UpdateStatusOptions,
  CancelOrderOptions,
  AssignDriverOptions
} from '../types';
import { logger } from '@lib/logger';

export interface UseOrderMutationsResult {
  creating: boolean;
  updating: boolean;
  cancelling: boolean;
  error: string | null;

  createOrder: (options: CreateOrderOptions) => Promise<Order | null>;
  updateStatus: (options: UpdateStatusOptions) => Promise<boolean>;
  cancelOrder: (options: CancelOrderOptions) => Promise<boolean>;
  assignDriver: (options: AssignDriverOptions) => Promise<boolean>;
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<boolean>;
}

export function useOrderMutations(): UseOrderMutationsResult {
  const services = useServices();
  const dataStore = services?.dataStore || null;

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (options: CreateOrderOptions): Promise<Order | null> => {
    if (!dataStore?.createOrder) {
      setError('Create order service not available');
      return null;
    }

    setCreating(true);
    setError(null);

    try {
      const orderData: any = {
        businessId: options.businessId,
        customer: options.customer,
        items: options.items,
        paymentMethod: options.paymentMethod,
        priority: options.priority || 'normal',
        discount: options.discount || 0,
        deliveryFee: options.deliveryFee || 0,
        notes: options.notes,
        tags: options.tags || [],
        createdBy: options.createdBy
      };

      const order = await dataStore.createOrder(orderData);

      if (order) {
        logger.info(`Order created successfully: ${order.id}`);
        return order;
      }

      setError('Failed to create order');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      logger.error('Create order failed', err);
      setError(errorMessage);
      return null;
    } finally {
      setCreating(false);
    }
  }, [dataStore]);

  const updateStatus = useCallback(async (options: UpdateStatusOptions): Promise<boolean> => {
    if (!dataStore?.updateOrder) {
      setError('Update order service not available');
      return false;
    }

    setUpdating(true);
    setError(null);

    try {
      await dataStore.updateOrder(options.orderId, {
        status: options.newStatus,
        timeline: {
          status: options.newStatus,
          timestamp: new Date(),
          performedBy: options.performedBy,
          notes: options.notes,
          metadata: options.metadata
        }
      });

      logger.info(`Order ${options.orderId} status updated to ${options.newStatus}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order status';
      logger.error('Update status failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [dataStore]);

  const cancelOrder = useCallback(async (options: CancelOrderOptions): Promise<boolean> => {
    if (!dataStore?.updateOrder) {
      setError('Update order service not available');
      return false;
    }

    setCancelling(true);
    setError(null);

    try {
      await dataStore.updateOrder(options.orderId, {
        status: 'cancelled',
        timeline: {
          status: 'cancelled',
          timestamp: new Date(),
          performedBy: options.performedBy,
          notes: `Cancelled: ${options.reason}`,
          metadata: {
            ...options.metadata,
            cancellationReason: options.reason,
            refundAmount: options.refundAmount
          }
        }
      });

      logger.info(`Order ${options.orderId} cancelled: ${options.reason}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
      logger.error('Cancel order failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setCancelling(false);
    }
  }, [dataStore]);

  const assignDriver = useCallback(async (options: AssignDriverOptions): Promise<boolean> => {
    if (!dataStore?.updateOrder) {
      setError('Update order service not available');
      return false;
    }

    setUpdating(true);
    setError(null);

    try {
      await dataStore.updateOrder(options.orderId, {
        delivery: {
          driverId: options.driverId,
          driverName: options.driverName,
          estimatedDeliveryTime: options.estimatedDeliveryTime
        },
        status: 'assigned',
        timeline: {
          status: 'assigned',
          timestamp: new Date(),
          performedBy: options.performedBy,
          notes: options.notes || `Assigned to driver: ${options.driverName}`,
          metadata: options.metadata
        }
      });

      logger.info(`Order ${options.orderId} assigned to driver ${options.driverId}`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign driver';
      logger.error('Assign driver failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [dataStore]);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<Order>): Promise<boolean> => {
    if (!dataStore?.updateOrder) {
      setError('Update order service not available');
      return false;
    }

    setUpdating(true);
    setError(null);

    try {
      await dataStore.updateOrder(orderId, updates);
      logger.info(`Order ${orderId} updated successfully`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order';
      logger.error('Update order failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [dataStore]);

  return {
    creating,
    updating,
    cancelling,
    error,
    createOrder,
    updateStatus,
    cancelOrder,
    assignDriver,
    updateOrder
  };
}
