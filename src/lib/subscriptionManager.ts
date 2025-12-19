import { logger } from './logger';

logger.info('[FRONTEND-ONLY] SubscriptionManager loaded - real-time disabled');

type SubscriptionCallback<T = any> = (payload: T) => void;

interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  debounceMs?: number;
}

class SubscriptionManager {
  /**
   * No-op subscribe function for frontend-only mode
   * Returns a cleanup function that does nothing
   */
  subscribe<T = any>(
    _supabase: any,
    config: SubscriptionConfig,
    _callback: SubscriptionCallback<T>
  ): () => void {
    logger.debug(`[FRONTEND-ONLY] Subscription request for ${config.table} (no-op)`);

    // Return no-op cleanup function
    return () => {
      logger.debug(`[FRONTEND-ONLY] Unsubscribe called for ${config.table} (no-op)`);
    };
  }

  /**
   * No-op cleanup function
   */
  cleanupAll(): void {
    logger.debug('[FRONTEND-ONLY] CleanupAll called (no-op)');
  }

  /**
   * Return empty stats
   */
  getStats(): {
    activeSubscriptions: number;
    totalCallbacks: number;
    subscriptionKeys: string[];
  } {
    return {
      activeSubscriptions: 0,
      totalCallbacks: 0,
      subscriptionKeys: []
    };
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

// Export hook for React components (no-op version)
export function useRealtimeSubscription<T = any>(
  _supabase: any | null,
  config: SubscriptionConfig,
  _callback: SubscriptionCallback<T>,
  enabled = true
): void {
  if (!enabled) return;

  logger.debug(`[FRONTEND-ONLY] useRealtimeSubscription called for ${config.table} (no-op)`);

  // Return undefined (no cleanup needed)
  return undefined;
}
