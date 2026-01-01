import { useState, useEffect, useCallback } from 'react';
import { useOrderRepository } from '../../foundation/container';
import {
  Order,
  OrderStatus,
  CreateOrderData,
} from '../../domain/orders/entities';
import {
  OrderFilters,
  OrderSortOptions,
  PaginatedResult,
} from '../../domain/orders/repositories/IOrderRepository';
import { logger } from '../../lib/logger';

export interface UseOrdersOptions {
  filters?: OrderFilters;
  sort?: OrderSortOptions;
  page?: number;
  pageSize?: number;
  autoLoad?: boolean;
}

export interface UseOrdersReturn {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  updateFilters: (filters: Partial<OrderFilters>) => void;
  updateSort: (sort: OrderSortOptions) => void;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const repository = useOrderRepository();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(options.page || 1);
  const [pageSize] = useState(options.pageSize || 20);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(options.filters || {});
  const [sort, setSort] = useState<OrderSortOptions | undefined>(options.sort);

  const loadOrders = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const currentPage = reset ? 1 : page;

        const result: PaginatedResult<Order> = await repository.findMany(filters, {
          sort,
          page: currentPage,
          pageSize,
        });

        if (reset) {
          setOrders(result.data);
          setPage(1);
        } else {
          setOrders((prev) => [...prev, ...result.data]);
        }

        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load orders';
        setError(errorMessage);
        logger.error('useOrders.loadOrders failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [repository, filters, sort, page, pageSize]
  );

  const refetch = useCallback(async () => {
    await loadOrders(true);
  }, [loadOrders]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setPage((prev) => prev + 1);
  }, [hasMore, loading]);

  const updateFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const updateSort = useCallback((newSort: OrderSortOptions) => {
    setSort(newSort);
    setPage(1);
  }, []);

  useEffect(() => {
    if (options.autoLoad !== false) {
      loadOrders(true);
    }
  }, [filters, sort]);

  useEffect(() => {
    if (page > 1) {
      loadOrders(false);
    }
  }, [page]);

  return {
    orders,
    total,
    page,
    pageSize,
    hasMore,
    loading,
    error,
    refetch,
    loadMore,
    updateFilters,
    updateSort,
  };
}
