import { useState, useEffect, useCallback } from 'react';
import { useOrderRepository } from '../../foundation/container';
import { Order, OrderStatus } from '../../domain/orders/entities';
import { logger } from '../../lib/logger';

export interface UseOrderOptions {
  orderId: string;
  autoLoad?: boolean;
}

export interface UseOrderReturn {
  order: Order | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStatus: (
    newStatus: OrderStatus,
    performedBy: string,
    notes?: string
  ) => Promise<void>;
  assignDriver: (
    driverId: string,
    driverName: string,
    performedBy: string
  ) => Promise<void>;
  update: () => Promise<void>;
}

export function useOrder(options: UseOrderOptions): UseOrderReturn {
  const repository = useOrderRepository();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await repository.findById(options.orderId);

      if (!result) {
        setError('Order not found');
        setOrder(null);
      } else {
        setOrder(result);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load order';
      setError(errorMessage);
      logger.error('useOrder.loadOrder failed:', err);
    } finally {
      setLoading(false);
    }
  }, [repository, options.orderId]);

  const refetch = useCallback(async () => {
    await loadOrder();
  }, [loadOrder]);

  const updateStatus = useCallback(
    async (newStatus: OrderStatus, performedBy: string, notes?: string) => {
      if (!order) {
        throw new Error('No order loaded');
      }

      try {
        setError(null);
        order.updateStatus(newStatus, performedBy, notes);
        const updated = await repository.update(order);
        setOrder(updated);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update order status';
        setError(errorMessage);
        logger.error('useOrder.updateStatus failed:', err);
        throw err;
      }
    },
    [order, repository]
  );

  const assignDriver = useCallback(
    async (driverId: string, driverName: string, performedBy: string) => {
      if (!order) {
        throw new Error('No order loaded');
      }

      try {
        setError(null);
        order.assignDriver(driverId, driverName, performedBy);
        const updated = await repository.update(order);
        setOrder(updated);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to assign driver';
        setError(errorMessage);
        logger.error('useOrder.assignDriver failed:', err);
        throw err;
      }
    },
    [order, repository]
  );

  const update = useCallback(async () => {
    if (!order) {
      throw new Error('No order loaded');
    }

    try {
      setError(null);
      const updated = await repository.update(order);
      setOrder(updated);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update order';
      setError(errorMessage);
      logger.error('useOrder.update failed:', err);
      throw err;
    }
  }, [order, repository]);

  useEffect(() => {
    if (options.autoLoad !== false) {
      loadOrder();
    }
  }, [options.orderId]);

  return {
    order,
    loading,
    error,
    refetch,
    updateStatus,
    assignDriver,
    update,
  };
}
