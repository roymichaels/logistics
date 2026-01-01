import { useState, useEffect, useCallback } from 'react';
import { DashboardMetric } from '@components/dashboard-v2/types';

interface UseDashboardDataOptions<T> {
  fetcher: () => Promise<T>;
  transformer: (data: T) => DashboardMetric[];
  refreshInterval?: number;
  enabled?: boolean;
  dependencies?: unknown[];
}

interface UseDashboardDataResult {
  metrics: DashboardMetric[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  data: unknown;
}

export function useDashboardData<T>({
  fetcher,
  transformer,
  refreshInterval = 30000,
  enabled = true,
  dependencies = []
}: UseDashboardDataOptions<T>): UseDashboardDataResult {
  const [data, setData] = useState<T | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
      const transformedMetrics = transformer(result);
      setMetrics(transformedMetrics);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load dashboard data');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, transformer, enabled]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  useEffect(() => {
    if (refreshInterval && enabled) {
      const interval = setInterval(() => {
        loadData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, enabled, loadData]);

  return {
    metrics,
    loading,
    error,
    refresh,
    data
  };
}
