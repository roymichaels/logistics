import { useState, useCallback, useMemo } from 'react';

interface UseTableStateOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  initialFilters?: Record<string, unknown>;
}

interface UseTableStateResult<T> {
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, unknown>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleSort: (field: string) => void;
  setFilter: (field: string, value: unknown) => void;
  clearFilter: (field: string) => void;
  clearAllFilters: () => void;
  reset: () => void;
  filterData: (data: T[]) => T[];
  sortData: (data: T[]) => T[];
  paginateData: (data: T[]) => T[];
  processData: (data: T[]) => {
    data: T[];
    total: number;
    totalPages: number;
  };
}

export function useTableState<T extends Record<string, any>>({
  initialPage = 1,
  initialPageSize = 10,
  initialSortBy = null,
  initialSortOrder = 'asc',
  initialFilters = {},
}: UseTableStateOptions = {}): UseTableStateResult<T> {
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [sortBy, setSortBy] = useState<string | null>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);

  const toggleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
    },
    [sortBy]
  );

  const setFilter = useCallback((field: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const clearFilter = useCallback((field: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[field];
      return newFilters;
    });
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
    setFilters(initialFilters);
  }, [initialPage, initialPageSize, initialSortBy, initialSortOrder, initialFilters]);

  const filterData = useCallback(
    (data: T[]): T[] => {
      if (Object.keys(filters).length === 0) return data;

      return data.filter((item) => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === null || value === undefined || value === '') return true;

          const itemValue = item[key];

          if (typeof value === 'string') {
            return String(itemValue).toLowerCase().includes(value.toLowerCase());
          }

          if (Array.isArray(value)) {
            return value.includes(itemValue);
          }

          return itemValue === value;
        });
      });
    },
    [filters]
  );

  const sortData = useCallback(
    (data: T[]): T[] => {
      if (!sortBy) return data;

      return [...data].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (aVal === bVal) return 0;

        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    },
    [sortBy, sortOrder]
  );

  const paginateData = useCallback(
    (data: T[]): T[] => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      return data.slice(start, end);
    },
    [page, pageSize]
  );

  const processData = useCallback(
    (data: T[]) => {
      const filtered = filterData(data);
      const sorted = sortData(filtered);
      const paginated = paginateData(sorted);

      return {
        data: paginated,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    },
    [filterData, sortData, paginateData, pageSize]
  );

  return {
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setPageSize,
    setSortBy,
    setSortOrder,
    toggleSort,
    setFilter,
    clearFilter,
    clearAllFilters,
    reset,
    filterData,
    sortData,
    paginateData,
    processData,
  };
}
