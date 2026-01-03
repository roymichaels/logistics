import { useMemo } from 'react';
import { Order } from '../types';

export function useOrderStats(orders: Order[]) {
  return useMemo(() => {
    const stats = {
      total: orders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      assigned: 0,
      pickedUp: 0,
      inTransit: 0,
      delivered: 0,
      cancelled: 0,
      failed: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
    };

    orders.forEach(order => {
      switch (order.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'preparing':
        case 'ready_for_pickup':
          stats.preparing++;
          break;
        case 'assigned':
          stats.assigned++;
          break;
        case 'picked_up':
          stats.pickedUp++;
          break;
        case 'in_transit':
          stats.inTransit++;
          break;
        case 'delivered':
          stats.delivered++;
          stats.totalRevenue += order.total || 0;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    // Calculate average order value
    if (stats.delivered > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.delivered;
    }

    return stats;
  }, [orders]);
}
