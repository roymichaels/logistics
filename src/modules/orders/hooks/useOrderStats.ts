import { useMemo } from 'react';
import { Order } from '../types';

export function useOrderStats(orders: Order[]) {
  return useMemo(() => {
    const stats = {
      total: orders.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    orders.forEach(order => {
      switch (order.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'completed':
          stats.completed++;
          stats.totalRevenue += order.total || 0;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    });

    return stats;
  }, [orders]);
}
