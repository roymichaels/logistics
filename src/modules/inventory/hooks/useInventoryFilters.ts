import { useState, useMemo } from 'react';
import type { InventoryFilters, AggregatedInventory } from '../types';

export function useInventoryFilters(inventory: AggregatedInventory[]) {
  const [filters, setFilters] = useState<InventoryFilters>({
    status: 'all',
    search: '',
  });

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return item.product_name.toLowerCase().includes(searchLower);
      }

      return true;
    });
  }, [inventory, filters]);

  const clearFilters = () => {
    setFilters({
      status: 'all',
      search: '',
    });
  };

  return {
    filters,
    setFilters,
    filteredInventory,
    clearFilters,
  };
}
