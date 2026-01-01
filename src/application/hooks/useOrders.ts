import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { Order } from '@domain/orders/entities';
import { logger } from '@lib/logger';

export interface UseOrdersOptions {
  businessId?: string;
  status?: string;
  autoLoad?: boolean;
}

export interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createOrder: (data: Partial<Order>) => Promise<Order | null>;
  updateOrder: (id: string, data: Partial<Order>) => Promise<boolean>;
  deleteOrder: (id: string) => Promise<boolean>;
  getOrder: (id: string) => Promise<Order | null>;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersResult {
  const { businessId, status, autoLoad = true } = options;
  const { dataStore } = useServices();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!dataStore?.listOrders) {
      setError('Orders service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (businessId) filters.businessId = businessId;
      if (status) filters.status = status;

      const result = await dataStore.listOrders(filters);
      setOrders(result || []);
    } catch (err) {
      logger.error('Failed to load orders', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [dataStore, businessId, status]);

  const createOrder = useCallback(async (data: Partial<Order>) => {
    if (!dataStore?.createOrder) {
      setError('Create order service not available');
      return null;
    }

    try {
      const newOrder = await dataStore.createOrder(data as any);
      if (newOrder) {
        setOrders(prev => [...prev, newOrder]);
      }
      return newOrder;
    } catch (err) {
      logger.error('Failed to create order', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      return null;
    }
  }, [dataStore]);

  const updateOrder = useCallback(async (id: string, data: Partial<Order>) => {
    if (!dataStore?.updateOrder) {
      setError('Update order service not available');
      return false;
    }

    try {
      await dataStore.updateOrder(id, data);
      setOrders(prev => prev.map(order =>
        order.id === id ? { ...order, ...data } : order
      ));
      return true;
    } catch (err) {
      logger.error('Failed to update order', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
      return false;
    }
  }, [dataStore]);

  const deleteOrder = useCallback(async (id: string) => {
    if (!dataStore?.deleteOrder) {
      setError('Delete order service not available');
      return false;
    }

    try {
      await dataStore.deleteOrder(id);
      setOrders(prev => prev.filter(order => order.id !== id));
      return true;
    } catch (err) {
      logger.error('Failed to delete order', err);
      setError(err instanceof Error ? err.message : 'Failed to delete order');
      return false;
    }
  }, [dataStore]);

  const getOrder = useCallback(async (id: string) => {
    if (!dataStore?.getOrder) {
      setError('Get order service not available');
      return null;
    }

    try {
      return await dataStore.getOrder(id);
    } catch (err) {
      logger.error('Failed to get order', err);
      setError(err instanceof Error ? err.message : 'Failed to get order');
      return null;
    }
  }, [dataStore]);

  useEffect(() => {
    if (autoLoad) {
      loadOrders();
    }
  }, [autoLoad, loadOrders]);

  return {
    orders,
    loading,
    error,
    refresh: loadOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrder,
  };
}
