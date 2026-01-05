/**
 * Query & Mutation Wrappers
 *
 * Provides instrumentation wrappers for data fetching and mutation operations.
 * Automatically tracks query execution time, cache hits, errors, and more.
 */

import { runtimeRegistry } from '../runtime-registry';
import { logger } from '../logger';

export interface QueryOptions {
  queryKey?: string | string[];
  queryName?: string;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export interface MutationOptions {
  mutationName?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface QueryResult<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface MutationResult<T> {
  data?: T;
  error?: Error;
  isLoading: boolean;
  mutate: (variables?: any) => Promise<T>;
  mutateAsync: (variables?: any) => Promise<T>;
}

/**
 * Wraps a query function with automatic performance tracking
 *
 * @param queryFn - The query function to execute
 * @param options - Query configuration options
 * @returns Wrapped query function with tracking
 *
 * @example
 * ```typescript
 * const fetchOrders = tracedQueryV2(
 *   async () => orderService.listOrders(),
 *   { queryName: 'fetchOrders', queryKey: ['orders'] }
 * );
 *
 * const result = await fetchOrders();
 * ```
 */
export function tracedQueryV2<T>(
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): () => Promise<T> {
  const queryName = options.queryName || 'anonymousQuery';
  const queryKeyStr = Array.isArray(options.queryKey)
    ? options.queryKey.join('.')
    : options.queryKey || 'unknown';

  return async function tracedQueryWrapper(): Promise<T> {
    const startTime = performance.now();
    const callId = `${queryName}:${Date.now()}`;

    try {
      logger.debug(`[Query] ${queryName} starting`, { queryKey: queryKeyStr });

      const result = await queryFn();
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: queryName,
        category: 'query',
        duration,
        timestamp: Date.now(),
        metadata: {
          queryKey: queryKeyStr,
          success: true,
          resultSize: JSON.stringify(result).length,
        },
      });

      logger.debug(`[Query] ${queryName} completed`, {
        duration: `${duration.toFixed(2)}ms`,
        queryKey: queryKeyStr,
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: queryName,
        category: 'query',
        duration,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          queryKey: queryKeyStr,
          success: false,
        },
      });

      logger.error(`[Query] ${queryName} failed`, {
        error,
        duration: `${duration.toFixed(2)}ms`,
        queryKey: queryKeyStr,
      });

      throw error;
    }
  };
}

/**
 * Wraps a mutation function with automatic performance tracking
 *
 * @param mutationFn - The mutation function to execute
 * @param options - Mutation configuration options
 * @returns Wrapped mutation function with tracking
 *
 * @example
 * ```typescript
 * const createOrder = tracedMutation(
 *   async (input) => orderService.createOrder(input),
 *   { mutationName: 'createOrder' }
 * );
 *
 * const order = await createOrder({ customer_name: 'John' });
 * ```
 */
export function tracedMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions = {}
): (variables: TVariables) => Promise<TData> {
  const mutationName = options.mutationName || 'anonymousMutation';

  return async function tracedMutationWrapper(variables: TVariables): Promise<TData> {
    const startTime = performance.now();
    const callId = `${mutationName}:${Date.now()}`;

    try {
      logger.debug(`[Mutation] ${mutationName} starting`, { variables });

      const result = await mutationFn(variables);
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: mutationName,
        category: 'mutation',
        duration,
        timestamp: Date.now(),
        metadata: {
          success: true,
          variablesSize: JSON.stringify(variables).length,
          resultSize: JSON.stringify(result).length,
        },
      });

      logger.debug(`[Mutation] ${mutationName} completed`, {
        duration: `${duration.toFixed(2)}ms`,
      });

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: mutationName,
        category: 'mutation',
        duration,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          success: false,
          variablesSize: JSON.stringify(variables).length,
        },
      });

      logger.error(`[Mutation] ${mutationName} failed`, {
        error,
        duration: `${duration.toFixed(2)}ms`,
      });

      if (options.onError && error instanceof Error) {
        options.onError(error);
      }

      throw error;
    }
  };
}

/**
 * Higher-order function to wrap query hooks with automatic tracking
 *
 * @example
 * ```typescript
 * export const useOrders = withQueryTracking(
 *   (filters) => {
 *     const { user } = useAuth();
 *     const orderService = useService(OrderService, user.id);
 *     return useQuery(['orders', filters], () => orderService.listOrders(filters));
 *   },
 *   'useOrders'
 * );
 * ```
 */
export function withQueryTracking<T extends (...args: any[]) => any>(
  hookFn: T,
  hookName: string
): T {
  return ((...args: any[]) => {
    const startTime = performance.now();

    try {
      const result = hookFn(...args);
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: hookName,
        category: 'hook',
        duration,
        timestamp: Date.now(),
        metadata: {
          type: 'query',
          argsCount: args.length,
        },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: hookName,
        category: 'hook',
        duration,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          type: 'query',
          argsCount: args.length,
        },
      });

      throw error;
    }
  }) as T;
}

/**
 * Higher-order function to wrap mutation hooks with automatic tracking
 *
 * @example
 * ```typescript
 * export const useCreateOrder = withMutationTracking(
 *   () => {
 *     const { user } = useAuth();
 *     const orderService = useService(OrderService, user.id);
 *     return useMutation((input) => orderService.createOrder(input));
 *   },
 *   'useCreateOrder'
 * );
 * ```
 */
export function withMutationTracking<T extends (...args: any[]) => any>(
  hookFn: T,
  hookName: string
): T {
  return ((...args: any[]) => {
    const startTime = performance.now();

    try {
      const result = hookFn(...args);
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: hookName,
        category: 'hook',
        duration,
        timestamp: Date.now(),
        metadata: {
          type: 'mutation',
          argsCount: args.length,
        },
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      runtimeRegistry.trackFunctionCall({
        functionName: hookName,
        category: 'hook',
        duration,
        timestamp: Date.now(),
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          type: 'mutation',
          argsCount: args.length,
        },
      });

      throw error;
    }
  }) as T;
}

/**
 * Utility to batch multiple queries with combined tracking
 *
 * @example
 * ```typescript
 * const [orders, drivers, inventory] = await batchQueries([
 *   { fn: () => orderService.listOrders(), name: 'fetchOrders' },
 *   { fn: () => driverService.listDrivers(), name: 'fetchDrivers' },
 *   { fn: () => inventoryService.listProducts(), name: 'fetchInventory' }
 * ]);
 * ```
 */
export async function batchQueries<T extends any[]>(
  queries: Array<{ fn: () => Promise<any>; name: string }>
): Promise<T> {
  const startTime = performance.now();
  const queryNames = queries.map((q) => q.name).join(', ');

  try {
    logger.debug(`[BatchQuery] Starting ${queries.length} queries`, { queryNames });

    const results = await Promise.all(queries.map((q) => tracedQueryV2(q.fn, { queryName: q.name })()));
    const duration = performance.now() - startTime;

    runtimeRegistry.trackFunctionCall({
      functionName: 'batchQueries',
      category: 'query',
      duration,
      timestamp: Date.now(),
      metadata: {
        queryCount: queries.length,
        queryNames,
        success: true,
      },
    });

    logger.debug(`[BatchQuery] Completed`, {
      duration: `${duration.toFixed(2)}ms`,
      queryCount: queries.length,
    });

    return results as T;
  } catch (error) {
    const duration = performance.now() - startTime;

    runtimeRegistry.trackFunctionCall({
      functionName: 'batchQueries',
      category: 'query',
      duration,
      timestamp: Date.now(),
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: {
        queryCount: queries.length,
        queryNames,
        success: false,
      },
    });

    logger.error(`[BatchQuery] Failed`, {
      error,
      duration: `${duration.toFixed(2)}ms`,
    });

    throw error;
  }
}
