import { useState, useCallback, useEffect } from 'react';
import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';

export type PaginationMode = 'offset' | 'cursor' | 'infinite';

export interface UsePaginationOptions {
  pageSize?: number;
  mode?: PaginationMode;
  initialPage?: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  offset: number;
  cursor: string | null;
  hasMore: boolean;
}

export interface UsePaginationResult {
  page: number;
  pageSize: number;
  offset: number;
  cursor: string | null;
  hasMore: boolean;
  nextPage: () => void;
  prevPage: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setCursor: (cursor: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  reset: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { pageSize: initialPageSize = 20, mode = 'offset', initialPage = 1 } = options;

  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    offset: (initialPage - 1) * initialPageSize,
    cursor: null,
    hasMore: true,
  });

  const nextPage = useCallback(() => {
    setState(prev => {
      const newPage = prev.page + 1;
      const newOffset = (newPage - 1) * prev.pageSize;

      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Pagination] Next Page',
        data: { page: newPage, mode },
      });

      logger.debug('[usePagination] Next page', { page: newPage, mode });

      return {
        ...prev,
        page: newPage,
        offset: newOffset,
      };
    });
  }, [mode]);

  const prevPage = useCallback(() => {
    setState(prev => {
      if (prev.page <= 1) return prev;

      const newPage = prev.page - 1;
      const newOffset = (newPage - 1) * prev.pageSize;

      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Pagination] Previous Page',
        data: { page: newPage, mode },
      });

      logger.debug('[usePagination] Previous page', { page: newPage, mode });

      return {
        ...prev,
        page: newPage,
        offset: newOffset,
      };
    });
  }, [mode]);

  const setPage = useCallback(
    (page: number) => {
      setState(prev => {
        const validPage = Math.max(1, page);
        const newOffset = (validPage - 1) * prev.pageSize;

        DiagnosticsStore.logEvent({
          type: 'log',
          message: '[Pagination] Set Page',
          data: { page: validPage, mode },
        });

        logger.debug('[usePagination] Set page', { page: validPage, mode });

        return {
          ...prev,
          page: validPage,
          offset: newOffset,
        };
      });
    },
    [mode]
  );

  const setPageSize = useCallback(
    (size: number) => {
      setState(prev => {
        const newPageSize = Math.max(1, size);
        const newOffset = (prev.page - 1) * newPageSize;

        DiagnosticsStore.logEvent({
          type: 'log',
          message: '[Pagination] Set Page Size',
          data: { pageSize: newPageSize, mode },
        });

        logger.debug('[usePagination] Set page size', { pageSize: newPageSize, mode });

        return {
          ...prev,
          pageSize: newPageSize,
          offset: newOffset,
        };
      });
    },
    [mode]
  );

  const setCursor = useCallback(
    (cursor: string | null) => {
      setState(prev => {
        logger.debug('[usePagination] Set cursor', { cursor, mode });

        return {
          ...prev,
          cursor,
        };
      });
    },
    [mode]
  );

  const setHasMore = useCallback(
    (hasMore: boolean) => {
      setState(prev => {
        if (prev.hasMore === hasMore) return prev;

        logger.debug('[usePagination] Set hasMore', { hasMore, mode });

        return {
          ...prev,
          hasMore,
        };
      });
    },
    [mode]
  );

  const reset = useCallback(() => {
    setState({
      page: initialPage,
      pageSize: initialPageSize,
      offset: (initialPage - 1) * initialPageSize,
      cursor: null,
      hasMore: true,
    });

    DiagnosticsStore.logEvent({
      type: 'log',
      message: '[Pagination] Reset',
      data: { mode },
    });

    logger.debug('[usePagination] Reset', { mode });
  }, [initialPage, initialPageSize, mode]);

  const canGoNext = mode === 'infinite' ? state.hasMore : true;
  const canGoPrev = state.page > 1;

  return {
    page: state.page,
    pageSize: state.pageSize,
    offset: state.offset,
    cursor: state.cursor,
    hasMore: state.hasMore,
    nextPage,
    prevPage,
    setPage,
    setPageSize,
    setCursor,
    setHasMore,
    reset,
    canGoNext,
    canGoPrev,
  };
}
