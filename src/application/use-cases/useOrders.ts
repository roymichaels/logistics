import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../services/useApp';
import { OrderQueries, OrderCommands } from '../';
import type { Order } from '../queries/orders.queries';
import type { CreateOrderInput, AssignOrderInput } from '../commands/orders.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import { Err, Ok } from '@/foundation/types/Result';

export const useOrders = (filters?: {
  business_id?: string;
  status?: string;
  driver_id?: string;
}) => {
  const app = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new OrderQueries(app.db);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getOrders(filters);

    if (result.success) {
      setOrders(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
};

export const useOrder = (orderId: string) => {
  const app = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new OrderQueries(app.db);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getOrderById(orderId);

    if (result.success) {
      setOrder(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return {
    order,
    loading,
    error,
    refetch: fetchOrder,
  };
};

export const useCreateOrder = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new OrderCommands(app.db);

  const createOrder = useCallback(async (input: CreateOrderInput): AsyncResult<{ id: string }, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.createOrder(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    createOrder,
    loading,
    error,
  };
};

export const useAssignOrder = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new OrderCommands(app.db);

  const assignOrder = useCallback(async (input: AssignOrderInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.assignOrder(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    assignOrder,
    loading,
    error,
  };
};

export const useUpdateOrderStatus = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new OrderCommands(app.db);

  const updateStatus = useCallback(
    async (
      orderId: string,
      status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled'
    ): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.updateOrderStatus(orderId, status);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    updateStatus,
    loading,
    error,
  };
};

export const useOrderStats = (businessId?: string) => {
  const app = useApp();
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    assigned: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new OrderQueries(app.db);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getOrderStats(businessId);

    if (result.success) {
      setStats(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
};
