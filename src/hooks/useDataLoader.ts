import { useState, useEffect, useCallback } from 'react';

interface UseDataLoaderOptions<T> {
  fetcher: () => Promise<T>;
  dependencies?: unknown[];
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface UseDataLoaderResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (data: T | undefined) => void;
}

export function useDataLoader<T>({
  fetcher,
  dependencies = [],
  initialData,
  onSuccess,
  onError,
  enabled = true,
}: UseDataLoaderOptions<T>): UseDataLoaderResult<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, enabled, onSuccess, onError]);

  useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch,
    setData,
  };
}
