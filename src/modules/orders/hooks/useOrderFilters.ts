import { useState, useMemo } from 'react';
import { Order, OrderFilters } from '../types';

export function useOrderFilters(orders: Order[]) {
  const [filters, setFilters] = useState<OrderFilters>({});

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.customerId && order.customerId !== filters.customerId) return false;
      if (filters.driverId && order.driverId !== filters.driverId) return false;
      if (filters.startDate && new Date(order.createdAt) < filters.startDate) return false;
      if (filters.endDate && new Date(order.createdAt) > filters.endDate) return false;
      return true;
    });
  }, [orders, filters]);

  return {
    filters,
    setFilters,
    filteredOrders,
    clearFilters: () => setFilters({}),
  };
}
