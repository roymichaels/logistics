import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, UseQueryOptions } from './useQuery';
import { usePagination, UsePaginationOptions, PaginationMode } from '../pagination/usePagination';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import { logger } from '@/lib/logger';

export interface UsePaginatedQueryOptions extends UseQueryOptions, UsePaginationOptions {
  mode?: PaginationMode;
}

export interface PaginatedData<T> {
  items: T[];
  total?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
}

export interface UsePaginatedQueryResult<T> {
  data: T[];
  allData: T[];
  loading: boolean;
  error: ClassifiedError | null;
  stale: boolean;
  page: number;
  pageSize: number;
  hasMore: boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => Promise<void>;
  reset: () => void;
  fetchNextPage: () => Promise<void>;
}

export function usePaginatedQuery<T = any>(
  keyBase: string | string[],
  fetcher: (params: { page: number; pageSize: number; offset: number; cursor: string | null }) => Promise<any>,
  options: UsePaginatedQueryOptions = {}
): UsePaginatedQueryResult<T> {
  const { mode = 'offset', pageSize: initialPageSize = 20, ...queryOptions } = options;

  const pagination = usePagination({ pageSize: initialPageSize, mode });
  const [allData, setAllData] = useState<T[]>([]);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const baseKey = Array.isArray(keyBase) ? keyBase.join(':') : keyBase;
  const queryKey = `${baseKey}:page:${pagination.page}:size:${pagination.pageSize}`;

  const fetcherWithPagination = useCallback(async () => {
    const result = await fetcher({
      page: pagination.page,
      pageSize: pagination.pageSize,
      offset: pagination.offset,
      cursor: pagination.cursor,
    });

    if (result && typeof result === 'object') {
      if ('success' in result && result.success) {
        const data = result.data;

        if (Array.isArray(data)) {
          return {
            items: data,
            hasMore: data.length >= pagination.pageSize,
          };
        }

        if (data && typeof data === 'object' && 'items' in data) {
          return data as PaginatedData<T>;
        }

        return {
          items: [],
          hasMore: false,
        };
      } else if ('success' in result && !result.success) {
        throw result.error;
      }
    }

    if (Array.isArray(result)) {
      return {
        items: result,
        hasMore: result.length >= pagination.pageSize,
      };
    }

    if (result && typeof result === 'object' && 'items' in result) {
      return result as PaginatedData<T>;
    }

    return {
      items: [],
      hasMore: false,
    };
  }, [fetcher, pagination.page, pagination.pageSize, pagination.offset, pagination.cursor]);

  const query = useQuery<PaginatedData<T>>(queryKey, fetcherWithPagination, {
    ...queryOptions,
    enabled: queryOptions.enabled !== false,
  });

  useEffect(() => {
    if (query.data) {
      if (mode === 'infinite') {
        setAllData(prev => {
          if (pagination.page === 1) {
            return query.data.items;
          }
          const existingIds = new Set(prev.map((item: any) => item.id || JSON.stringify(item)));
          const newItems = query.data.items.filter(
            (item: any) => !existingIds.has(item.id || JSON.stringify(item))
          );
          return [...prev, ...newItems];
        });
      } else {
        setAllData(query.data.items);
      }

      if (query.data.hasMore !== undefined) {
        pagination.setHasMore(query.data.hasMore);
      }

      if (query.data.nextCursor !== undefined) {
        pagination.setCursor(query.data.nextCursor);
      }
    }
  }, [query.data, mode, pagination.page]);

  const fetchNextPage = useCallback(async () => {
    if (!pagination.hasMore || isFetchingNextPage) return;

    setIsFetchingNextPage(true);
    try {
      pagination.nextPage();
      await query.refetch();
    } catch (error) {
      logger.error('[usePaginatedQuery] Fetch next page failed', error);
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [pagination, query, isFetchingNextPage]);

  const reset = useCallback(() => {
    pagination.reset();
    setAllData([]);
  }, [pagination]);

  const currentPageData = useMemo(() => {
    return mode === 'infinite' ? allData : (query.data?.items || []);
  }, [mode, allData, query.data]);

  return {
    data: currentPageData,
    allData,
    loading: query.loading || isFetchingNextPage,
    error: query.error,
    stale: query.stale,
    page: pagination.page,
    pageSize: pagination.pageSize,
    hasMore: pagination.hasMore,
    canGoNext: pagination.canGoNext,
    canGoPrev: pagination.canGoPrev,
    nextPage: pagination.nextPage,
    prevPage: pagination.prevPage,
    setPage: pagination.setPage,
    setPageSize: pagination.setPageSize,
    refetch: query.refetch,
    reset,
    fetchNextPage,
  };
}
