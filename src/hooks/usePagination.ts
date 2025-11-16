import { useState, useCallback, useEffect } from 'react';

export interface PaginationParams {
  page: number;
  pageSize: number;
  totalItems?: number;
}

export interface PaginationResult<T> {
  data: T[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: Error | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  refresh: () => void;
  setPageSize: (size: number) => void;
}

interface UsePaginationOptions<T> {
  initialPage?: number;
  initialPageSize?: number;
  fetchData: (params: { from: number; to: number; page: number; pageSize: number }) => Promise<{ data: T[]; count?: number }>;
}

export function usePagination<T>({
  initialPage = 1,
  initialPageSize = 20,
  fetchData
}: UsePaginationOptions<T>): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [data, setData] = useState<T[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const result = await fetchData({ from, to, page: currentPage, pageSize });

      setData(result.data);
      if (result.count !== undefined) {
        setTotalItems(result.count);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, fetchData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const updatePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  return {
    data,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    goToPage,
    nextPage,
    previousPage,
    refresh,
    setPageSize: updatePageSize
  };
}

// Infinite scroll pagination hook
export interface InfiniteScrollResult<T> {
  data: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

interface UseInfiniteScrollOptions<T> {
  initialPageSize?: number;
  fetchData: (params: { from: number; to: number; page: number; pageSize: number }) => Promise<{ data: T[]; count?: number }>;
}

export function useInfiniteScroll<T>({
  initialPageSize = 20,
  fetchData
}: UseInfiniteScrollOptions<T>): InfiniteScrollResult<T> {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T[]>([]);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const from = (pageNum - 1) * initialPageSize;
      const to = from + initialPageSize - 1;

      const result = await fetchData({ from, to, page: pageNum, pageSize: initialPageSize });

      if (append) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }

      if (result.count !== undefined) {
        setTotalItems(result.count);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [initialPageSize, fetchData]);

  useEffect(() => {
    loadData(1, false);
  }, [loadData]);

  const hasMore = totalItems !== null ? data.length < totalItems : true;

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, true);
    }
  }, [page, isLoadingMore, hasMore, loadData]);

  const refresh = useCallback(() => {
    setPage(1);
    setData([]);
    setTotalItems(null);
    loadData(1, false);
  }, [loadData]);

  return {
    data,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh
  };
}
