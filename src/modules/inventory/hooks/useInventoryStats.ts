import { useMemo } from 'react';
import type { AggregatedInventory, InventoryStats } from '../types';

export function useInventoryStats(inventory: AggregatedInventory[]): InventoryStats {
  return useMemo(() => {
    const stats: InventoryStats = {
      totalItems: inventory.length,
      lowStockCount: 0,
      outOfStockCount: 0,
      inStockCount: 0,
      totalValue: 0,
    };

    inventory.forEach(item => {
      if (item.status === 'low') {
        stats.lowStockCount++;
      } else if (item.status === 'out') {
        stats.outOfStockCount++;
      } else if (item.status === 'in_stock') {
        stats.inStockCount++;
      }
    });

    return stats;
  }, [inventory]);
}
