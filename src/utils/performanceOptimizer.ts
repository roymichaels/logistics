/**
 * Performance Optimization Utilities
 *
 * Provides utilities for optimizing React component performance:
 * - Debounced and throttled callbacks
 * - Memoization helpers
 * - Request deduplication
 * - Performance monitoring
 */

import { useCallback, useEffect, useRef, DependencyList } from 'react';

/**
 * Creates a debounced version of a callback
 * Delays execution until after wait milliseconds have elapsed since the last call
 */
export function useDebounced Callback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay, ...deps]
  );
}

/**
 * Creates a throttled version of a callback
 * Executes at most once per specified time period
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList
): T {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        callbackRef.current(...args);
        lastRunRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastRunRef.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [delay, ...deps]
  );
}

/**
 * Request Deduplication Cache
 * Prevents multiple identical requests from being made simultaneously
 */
class RequestCache {
  private pending = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly DEFAULT_TTL = 5000; // 5 seconds

  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Check if request is already pending
    const pending = this.pending.get(key);
    if (pending) {
      return pending;
    }

    // Create new request
    const promise = fetcher()
      .then((data) => {
        this.cache.set(key, { data, timestamp: Date.now() });
        this.pending.delete(key);
        return data;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  invalidate(keyPattern?: string): void {
    if (keyPattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }
}

export const requestCache = new RequestCache();

/**
 * Performance Monitoring
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();

  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      logger.warn(`No start mark found for "${label}"`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    if (duration > 100) {
      logger.warn(`⚠️ Slow operation "${label}": ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure(label: string, fn: () => void): void {
    this.start(label);
    fn();
    this.end(label);
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

export const perfMonitor = new PerformanceMonitor();

/**
 * Batches multiple state updates into a single render
 */
export function batchUpdates<T extends Record<string, any>>(
  setState: (updates: Partial<T>) => void,
  updates: Partial<T>[]
): void {
  const merged = updates.reduce((acc, update) => ({ ...acc, ...update }), {});
  setState(merged);
}

/**
 * Simple debounce function for non-React contexts
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Simple throttle function for non-React contexts
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
