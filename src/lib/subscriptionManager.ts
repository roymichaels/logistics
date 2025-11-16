import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

type SubscriptionCallback<T = any> = (payload: T) => void;

interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  debounceMs?: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private callbacks: Map<string, Set<SubscriptionCallback>> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to real-time changes on a Supabase table
   *
   * @param supabase - Supabase client instance
   * @param config - Subscription configuration
   * @param callback - Function to call when changes occur
   * @returns Cleanup function to unsubscribe
   */
  subscribe<T = any>(
    supabase: SupabaseClient,
    config: SubscriptionConfig,
    callback: SubscriptionCallback<T>
  ): () => void {
    const { table, event = '*', filter, debounceMs = 0 } = config;
    const subscriptionKey = `${table}:${event}:${filter || 'all'}`;

    // Register callback
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, new Set());
    }
    this.callbacks.get(subscriptionKey)!.add(callback);

    // Create channel if it doesn't exist
    if (!this.subscriptions.has(subscriptionKey)) {
      this.createSubscription(supabase, subscriptionKey, config);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionKey, callback);
    };
  }

  /**
   * Create a new subscription channel
   */
  private createSubscription(
    supabase: SupabaseClient,
    key: string,
    config: SubscriptionConfig
  ): void {
    const { table, event = '*', filter } = config;

    try {
      const channel = supabase
        .channel(`realtime:${key}`)
        .on(
          'postgres_changes' as any,
          {
            event,
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            this.handleChange(key, payload, config.debounceMs);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Subscription established', { key, table, event });
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Subscription error', new Error(`Failed to subscribe to ${key}`));
          }
        });

      this.subscriptions.set(key, channel);
    } catch (error) {
      logger.error('Failed to create subscription', error as Error, { key, table });
    }
  }

  /**
   * Handle incoming changes with optional debouncing
   */
  private handleChange(key: string, payload: any, debounceMs = 0): void {
    const callbacks = this.callbacks.get(key);
    if (!callbacks || callbacks.size === 0) return;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const executeCallbacks = () => {
      callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          logger.error('Subscription callback error', error as Error, { key });
        }
      });
    };

    // Execute immediately if no debounce, otherwise set timer
    if (debounceMs === 0) {
      executeCallbacks();
    } else {
      const timer = setTimeout(executeCallbacks, debounceMs);
      this.debounceTimers.set(key, timer);
    }
  }

  /**
   * Unsubscribe a specific callback
   */
  private unsubscribe(key: string, callback: SubscriptionCallback): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.delete(callback);

      // If no more callbacks, clean up the channel
      if (callbacks.size === 0) {
        this.cleanupChannel(key);
      }
    }
  }

  /**
   * Clean up a subscription channel
   */
  private cleanupChannel(key: string): void {
    const channel = this.subscriptions.get(key);
    if (channel) {
      channel.unsubscribe();
      this.subscriptions.delete(key);
      this.callbacks.delete(key);

      // Clear any pending debounce timers
      const timer = this.debounceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }

      logger.debug('Subscription cleaned up', { key });
    }
  }

  /**
   * Clean up all subscriptions (call on app unmount/logout)
   */
  cleanupAll(): void {
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Unsubscribe from all channels
    this.subscriptions.forEach((channel, key) => {
      channel.unsubscribe();
      logger.debug('Subscription cleaned up', { key });
    });

    this.subscriptions.clear();
    this.callbacks.clear();

    logger.info('All subscriptions cleaned up');
  }

  /**
   * Get subscription statistics
   */
  getStats(): {
    activeSubscriptions: number;
    totalCallbacks: number;
    subscriptionKeys: string[];
  } {
    let totalCallbacks = 0;
    this.callbacks.forEach((callbacks) => {
      totalCallbacks += callbacks.size;
    });

    return {
      activeSubscriptions: this.subscriptions.size,
      totalCallbacks,
      subscriptionKeys: Array.from(this.subscriptions.keys())
    };
  }
}

// Export singleton instance
export const subscriptionManager = new SubscriptionManager();

// Export hook for React components
export function useRealtimeSubscription<T = any>(
  supabase: SupabaseClient | null,
  config: SubscriptionConfig,
  callback: SubscriptionCallback<T>,
  enabled = true
): void {
  // This will be used with useEffect in components
  if (!enabled || !supabase) return;

  const cleanup = subscriptionManager.subscribe(supabase, config, callback);

  // Return cleanup function
  return cleanup as any;
}
