import { useState, useCallback } from 'react';

interface UseDataFetchOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (fetcher: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useDataFetch<T = unknown>(
  options: UseDataFetchOptions = {}
): UseDataFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (fetcher: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}
