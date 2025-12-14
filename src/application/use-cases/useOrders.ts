import { useApp } from '../services/useApp';
import { useQuery } from '../hooks/useQuery';
import { useMutation } from '../hooks/useMutation';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { OrderQueries, OrderCommands } from '../';
import type { Order } from '../queries/orders.queries';
import type { CreateOrderInput, AssignOrderInput } from '../commands/orders.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export const useOrders = (filters?: {
  business_id?: string;
  status?: string;
  driver_id?: string;
}) => {
  const app = useApp();
  const queries = new OrderQueries(app.db);

  const filtersKey = JSON.stringify(filters || {});
  const cacheKey = `orders:list:${filters?.business_id || 'all'}:${filtersKey}`;

  const result = useQuery<Order[]>(
    cacheKey,
    () => queries.getOrders(filters),
    { ttl: 15000 }
  );

  return {
    orders: result.data || [],
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};

export const useOrdersPaginated = (
  filters?: {
    business_id?: string;
    status?: string;
    driver_id?: string;
  },
  pageSize = 20
) => {
  const app = useApp();
  const queries = new OrderQueries(app.db);

  const filtersKey = JSON.stringify(filters || {});
  const baseKey = `orders:page:${filters?.business_id || 'all'}:${filtersKey}`;

  const result = usePaginatedQuery<Order>(
    baseKey,
    ({ page, pageSize: size, offset }) =>
      queries.getOrders({ ...filters, page, limit: size, offset }),
    { pageSize, ttl: 15000, mode: 'infinite' }
  );

  return result;
};

export const useOrder = (orderId: string) => {
  const app = useApp();
  const queries = new OrderQueries(app.db);

  const cacheKey = `orders:detail:${orderId}`;

  const result = useQuery<Order>(
    cacheKey,
    () => queries.getOrderById(orderId),
    { ttl: 10000, enabled: !!orderId }
  );

  return {
    order: result.data,
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};

export const useCreateOrder = () => {
  const app = useApp();
  const commands = new OrderCommands(app.db);

  const mutation = useMutation<CreateOrderInput, { id: string }>(
    (input) => commands.createOrder(input),
    {
      invalidatePatterns: ['orders:list:*', 'orders:page:*'],
      emitEvent: 'order.created',
    }
  );

  return {
    createOrder: mutation.mutate,
    createOrderAsync: mutation.mutateAsync,
    loading: mutation.loading,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
};

export const useAssignOrder = () => {
  const app = useApp();
  const commands = new OrderCommands(app.db);

  const mutation = useMutation<AssignOrderInput, void>(
    (input) => commands.assignOrder(input),
    {
      invalidatePatterns: [
        'orders:list:*',
        'orders:page:*',
        'orders:detail:*',
        'drivers:orders:*',
      ],
      emitEvent: 'order.assigned',
    }
  );

  return {
    assignOrder: mutation.mutate,
    assignOrderAsync: mutation.mutateAsync,
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};

export const useUpdateOrderStatus = () => {
  const app = useApp();
  const commands = new OrderCommands(app.db);

  const mutation = useMutation<
    { orderId: string; status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled' },
    void
  >(
    ({ orderId, status }) => commands.updateOrderStatus(orderId, status),
    {
      invalidatePatterns: [
        'orders:list:*',
        'orders:page:*',
        'orders:detail:*',
        'dashboard:*',
      ],
      emitEvent: 'order.status_updated',
    }
  );

  return {
    updateStatus: (orderId: string, status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled') =>
      mutation.mutate({ orderId, status }),
    updateStatusAsync: (orderId: string, status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled') =>
      mutation.mutateAsync({ orderId, status }),
    loading: mutation.loading,
    error: mutation.error,
    reset: mutation.reset,
  };
};

export const useOrderStats = (businessId?: string) => {
  const app = useApp();
  const queries = new OrderQueries(app.db);

  const cacheKey = `orders:stats:${businessId || 'all'}`;

  const result = useQuery<{
    total: number;
    pending: number;
    assigned: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
  }>(
    cacheKey,
    () => queries.getOrderStats(businessId),
    { ttl: 30000 }
  );

  return {
    stats: result.data,
    loading: result.loading,
    error: result.error,
    stale: result.stale,
    refetch: result.refetch,
  };
};
