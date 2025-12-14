import { useState, useEffect, useCallback, useRef } from 'react';
import { queryCache } from '../cache/QueryCache';
import { persistentCache } from '../cache/PersistentCache';
import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import { Err } from '@/foundation/types/Result';

export interface UseQueryOptions {
  ttl?: number;
  enabled?: boolean;
  refetchOnFocus?: boolean;
  refetchInterval?: number;
  persistCache?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: ClassifiedError) => void;
}

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: ClassifiedError | null;
  stale: boolean;
  refetch: () => Promise<void>;
}

export function useQuery<T = any>(
  key: string | string[],
  fetcher: () => Promise<any>,
  options: UseQueryOptions = {}
): UseQueryResult<T> {
  const {
    ttl = 60000,
    enabled = true,
    refetchOnFocus = false,
    refetchInterval,
    persistCache: shouldPersist = false,
    onSuccess,
    onError,
  } = options;

  const cacheKey = Array.isArray(key) ? key.join(':') : key;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);
  const [stale, setStale] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetcherRef = useRef(fetcher);
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  fetcherRef.current = fetcher;

  const loadFromCache = useCallback(async () => {
    const cached = queryCache.get(cacheKey);

    if (cached !== null) {
      setData(cached);
      setStale(queryCache.isStale(cacheKey, ttl));
      return true;
    }

    if (shouldPersist) {
      const persistent = await persistentCache.load(cacheKey);
      if (persistent !== null) {
        setData(persistent);
        queryCache.set(cacheKey, persistent, ttl);
        setStale(true);
        return true;
      }
    }

    return false;
  }, [cacheKey, ttl, shouldPersist]);

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (isFetchingRef.current) return;
      if (!enabled) return;

      isFetchingRef.current = true;

      if (!isBackground) {
        setLoading(true);
      }

      setError(null);

      try {
        DiagnosticsStore.logEvent({
          type: 'query',
          message: isBackground ? '[Query] Background Revalidate' : '[Query] Fetch',
          data: { key: cacheKey, isBackground },
        });

        const result = await fetcherRef.current();

        if (!mountedRef.current) return;

        let resultData: any;

        if (result && typeof result === 'object' && 'success' in result) {
          if (result.success) {
            resultData = result.data;
          } else {
            throw result.error || new Error('Query failed');
          }
        } else {
          resultData = result;
        }

        setData(resultData);
        setStale(false);
        setError(null);

        queryCache.set(cacheKey, resultData, ttl);

        if (shouldPersist) {
          persistentCache.save(cacheKey, resultData, ttl);
        }

        if (onSuccess) {
          onSuccess(resultData);
        }

        logger.debug('[useQuery] Success', { key: cacheKey });
      } catch (err: any) {
        if (!mountedRef.current) return;

        const classifiedError: ClassifiedError = err.type
          ? err
          : {
              type: 'unknown',
              message: err.message || 'Query failed',
              code: err.code,
              details: err,
            };

        setError(classifiedError);

        if (onError) {
          onError(classifiedError);
        }

        logger.error('[useQuery] Error', { key: cacheKey, error: classifiedError });

        DiagnosticsStore.logEvent({
          type: 'error',
          message: '[Query] Error',
          data: { key: cacheKey, error: classifiedError.message },
        });
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [cacheKey, enabled, ttl, shouldPersist, onSuccess, onError]
  );

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const initialize = async () => {
      const hasCached = await loadFromCache();

      if (!hasCached || queryCache.isStale(cacheKey, ttl)) {
        await fetchData(hasCached);
      }

      setInitialized(true);
    };

    initialize();
  }, [cacheKey, enabled]);

  useEffect(() => {
    if (!initialized || !stale || !enabled) return;

    fetchData(true);
  }, [stale, initialized, enabled]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetchData]);

  useEffect(() => {
    if (!refetchOnFocus || !enabled) return;

    const handleFocus = () => {
      if (queryCache.isStale(cacheKey, ttl)) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, cacheKey, ttl, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    stale,
    refetch,
  };
}
