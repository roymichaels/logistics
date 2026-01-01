import { useState, useCallback } from 'react';
import { useOrderRepository } from '../../foundation/container';
import { Order, CreateOrderData, OrderStatus } from '../../domain/orders/entities';
import { logger } from '../../lib/logger';

export interface UseOrderMutationsReturn {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  createOrder: (data: CreateOrderData) => Promise<Order>;
  updateOrder: (order: Order) => Promise<Order>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    performedBy: string,
    notes?: string
  ) => Promise<Order>;
}

export function useOrderMutations(): UseOrderMutationsReturn {
  const repository = useOrderRepository();
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(
    async (data: CreateOrderData): Promise<Order> => {
      try {
        setCreating(true);
        setError(null);

        const order = await repository.create(data);
        logger.info('Order created successfully:', order.id);
        return order;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create order';
        setError(errorMessage);
        logger.error('useOrderMutations.createOrder failed:', err);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [repository]
  );

  const updateOrder = useCallback(
    async (order: Order): Promise<Order> => {
      try {
        setUpdating(true);
        setError(null);

        const updated = await repository.update(order);
        logger.info('Order updated successfully:', order.id);
        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update order';
        setError(errorMessage);
        logger.error('useOrderMutations.updateOrder failed:', err);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [repository]
  );

  const deleteOrder = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        setDeleting(true);
        setError(null);

        await repository.delete(orderId);
        logger.info('Order deleted successfully:', orderId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete order';
        setError(errorMessage);
        logger.error('useOrderMutations.deleteOrder failed:', err);
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [repository]
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      performedBy: string,
      notes?: string
    ): Promise<Order> => {
      try {
        setUpdating(true);
        setError(null);

        const order = await repository.findById(orderId);
        if (!order) {
          throw new Error('Order not found');
        }

        order.updateStatus(status, performedBy, notes);
        const updated = await repository.update(order);
        logger.info('Order status updated successfully:', orderId, status);
        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update order status';
        setError(errorMessage);
        logger.error('useOrderMutations.updateOrderStatus failed:', err);
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [repository]
  );

  return {
    creating,
    updating,
    deleting,
    error,
    createOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
  };
}
