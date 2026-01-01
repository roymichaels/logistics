import { useState, useEffect } from 'react';
import { Driver, DriverFilters } from '../types';

export interface UseDriverFiltersResult {
  filteredDrivers: Driver[];
  filters: DriverFilters;
  setFilters: (filters: DriverFilters) => void;
  resetFilters: () => void;
  isFiltered: boolean;
}

const defaultFilters: DriverFilters = {
  status: undefined,
  zone_id: undefined,
  is_available: undefined,
  search: '',
  business_id: undefined
};

export function useDriverFilters(drivers: Driver[]): UseDriverFiltersResult {
  const [filters, setFilters] = useState<DriverFilters>(defaultFilters);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>(drivers);

  useEffect(() => {
    let result = [...drivers];

    if (filters.status) {
      result = result.filter(d => d.status === filters.status);
    }

    if (filters.is_available !== undefined) {
      result = result.filter(d => d.is_available === filters.is_available);
    }

    if (filters.business_id) {
      result = result.filter(d => d.business_id === filters.business_id);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(d =>
        d.user_id.toLowerCase().includes(search) ||
        d.phone?.toLowerCase().includes(search) ||
        d.vehicle_plate?.toLowerCase().includes(search) ||
        d.vehicle_type?.toLowerCase().includes(search)
      );
    }

    setFilteredDrivers(result);
  }, [drivers, filters]);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const isFiltered =
    filters.status !== undefined ||
    filters.zone_id !== undefined ||
    filters.is_available !== undefined ||
    (filters.search || '').trim() !== '' ||
    filters.business_id !== undefined;

  return {
    filteredDrivers,
    filters,
    setFilters,
    resetFilters,
    isFiltered
  };
}
