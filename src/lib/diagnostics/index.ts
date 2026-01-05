/**
 * Diagnostics Module
 *
 * Central export point for all diagnostic and instrumentation utilities.
 */

export { runtimeRegistry } from '../runtime-registry';
export type {
  ComponentEntry,
  ErrorEntry,
  RouteEntry,
  StoreAccessEntry,
  ContextAccessEntry,
  HookCallEntry,
  FunctionCallEntry,
  PerformanceMetrics
} from '../runtime-registry';

export {
  withDiagnostics,
  tracedService,
  tracedHook,
  tracedQuery,
  tracedContext,
  tracedAsync,
  Traced
} from './wrappers';

export {
  tracedQueryV2,
  tracedMutation,
  withQueryTracking,
  withMutationTracking,
  batchQueries
} from './queryWrappers';

export type {
  QueryOptions,
  MutationOptions,
  QueryResult,
  MutationResult
} from './queryWrappers';
