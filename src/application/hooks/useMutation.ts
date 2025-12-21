import { useState, useCallback, useRef } from 'react';
import { queryCache } from '../cache/QueryCache';
import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';
import { eventBus } from '@/foundation/events/EventBus';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export interface UseMutationOptions<TInput, TOutput> {
  invalidateKeys?: string[];
  invalidatePatterns?: string[];
  emitEvent?: string;
  optimisticUpdate?: (input: TInput) => void;
  rollbackOptimistic?: () => void;
  onSuccess?: (data: TOutput, input: TInput) => void;
  onError?: (error: ClassifiedError, input: TInput) => void;
  onSettled?: (data: TOutput | null, error: ClassifiedError | null, input: TInput) => void;
}

export interface UseMutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<AsyncResult<TOutput>>;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  loading: boolean;
  error: ClassifiedError | null;
  data: TOutput | null;
  reset: () => void;
}

export function useMutation<TInput = any, TOutput = any>(
  mutationFn: (input: TInput) => Promise<AsyncResult<TOutput>>,
  options: UseMutationOptions<TInput, TOutput> = {}
): UseMutationResult<TInput, TOutput> {
  const {
    invalidateKeys = [],
    invalidatePatterns = [],
    emitEvent,
    optimisticUpdate,
    rollbackOptimistic,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const mountedRef = useRef(true);

  const invalidateCache = useCallback(() => {
    invalidateKeys.forEach(key => {
      queryCache.clear(key);
      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Mutation] Invalidate Key',
        data: { key },
      });
    });

    invalidatePatterns.forEach(pattern => {
      queryCache.clearPattern(pattern);
      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Mutation] Invalidate Pattern',
        data: { pattern },
      });
    });

    if (invalidateKeys.length > 0 || invalidatePatterns.length > 0) {
      logger.debug('[useMutation] Cache invalidated', {
        keys: invalidateKeys,
        patterns: invalidatePatterns,
      });
    }
  }, [invalidateKeys, invalidatePatterns]);

  const emitDomainEvent = useCallback(
    (eventData: any) => {
      if (!emitEvent) return;

      try {
        eventBus.emit({
          type: emitEvent,
          eventType: 'domain',
          source: 'useMutation',
          payload: eventData,
          timestamp: Date.now(),
        });

        logger.debug('[useMutation] Event emitted', { event: emitEvent });
      } catch (err) {
        logger.warn('[useMutation] Failed to emit event', { event: emitEvent, error: err });
      }
    },
    [emitEvent]
  );

  const mutate = useCallback(
    async (input: TInput): Promise<AsyncResult<TOutput>> => {
      setLoading(true);
      setError(null);

      let optimisticApplied = false;

      try {
        if (optimisticUpdate) {
          optimisticUpdate(input);
          optimisticApplied = true;

          DiagnosticsStore.logEvent({
            type: 'log',
            message: '[Mutation] Optimistic Update Applied',
            data: { input },
          });

          logger.debug('[useMutation] Optimistic update applied');
        }

        DiagnosticsStore.logEvent({
          type: 'log',
          message: '[Mutation] Execute',
          data: { input },
        });

        const result = await mutationFn(input);

        if (!mountedRef.current) {
          return result;
        }

        if (result.success) {
          setData(result.data);
          setError(null);

          invalidateCache();

          emitDomainEvent(result.data);

          if (onSuccess) {
            onSuccess(result.data, input);
          }

          logger.debug('[useMutation] Success', { data: result.data });

          DiagnosticsStore.logEvent({
            type: 'log',
            message: '[Mutation] Success',
            data: { input, output: result.data },
          });
        } else {
          const mutationError = result.error;
          setError(mutationError);

          if (optimisticApplied && rollbackOptimistic) {
            rollbackOptimistic();
            DiagnosticsStore.logEvent({
              type: 'error',
              message: '[Mutation] Optimistic Rollback',
              data: { error: mutationError },
            });
            logger.debug('[useMutation] Optimistic update rolled back');
          }

          if (onError) {
            onError(mutationError, input);
          }

          logger.error('[useMutation] Error', { error: mutationError });

          DiagnosticsStore.logEvent({
            type: 'error',
            message: '[Mutation] Error',
            data: { input, error: mutationError.message },
          });
        }

        if (onSettled) {
          onSettled(
            result.success ? result.data : null,
            result.success ? null : result.error,
            input
          );
        }

        return result;
      } catch (err: any) {
        if (!mountedRef.current) {
          throw err;
        }

        const classifiedError: ClassifiedError = err.type
          ? err
          : {
              type: 'unknown',
              message: err.message || 'Mutation failed',
              code: err.code,
              details: err,
            };

        setError(classifiedError);

        if (optimisticApplied && rollbackOptimistic) {
          rollbackOptimistic();
          DiagnosticsStore.logEvent({
            type: 'error',
            message: '[Mutation] Optimistic Rollback',
            data: { error: classifiedError },
          });
          logger.debug('[useMutation] Optimistic update rolled back');
        }

        if (onError) {
          onError(classifiedError, input);
        }

        logger.error('[useMutation] Exception', { error: classifiedError });

        DiagnosticsStore.logEvent({
          type: 'error',
          message: '[Mutation] Exception',
          data: { input, error: classifiedError.message },
        });

        return {
          success: false,
          error: classifiedError,
        } as AsyncResult<TOutput>;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [
      mutationFn,
      optimisticUpdate,
      rollbackOptimistic,
      invalidateCache,
      emitDomainEvent,
      onSuccess,
      onError,
      onSettled,
    ]
  );

  const mutateAsync = useCallback(
    async (input: TInput): Promise<TOutput> => {
      const result = await mutate(input);
      if (result.success) {
        return result.data;
      } else {
        throw result.error;
      }
    },
    [mutate]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    mutate,
    mutateAsync,
    loading,
    error,
    data,
    reset,
  };
}
