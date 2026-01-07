import { useEffect } from 'react';
import { logger } from './logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

type SubscriptionCallback<T = any> = (payload: T) => void;

interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  debounceMs?: number;
  businessId?: string | null;
}

interface ActiveSubscription {
  channel: RealtimeChannel;
  callbacks: Set<SubscriptionCallback>;
  config: SubscriptionConfig;
}

class SubscriptionManager {
  private subscriptions = new Map<string, ActiveSubscription>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  private getSubscriptionKey(config: SubscriptionConfig): string {
    const parts = [
      config.table,
      config.event || '*',
      config.filter || 'all',
      config.businessId || 'global'
    ];
    return parts.join(':');
  }

  subscribe<T = any>(
    supabase: any,
    config: SubscriptionConfig,
    callback: SubscriptionCallback<T>
  ): () => void {
    if (!supabase) {
      logger.warn('[SubscriptionManager] No supabase client provided');
      return () => {};
    }

    const key = this.getSubscriptionKey(config);
    const existing = this.subscriptions.get(key);

    if (existing) {
      existing.callbacks.add(callback);
      logger.debug('[SubscriptionManager] Added callback to existing subscription', { key });

      return () => {
        existing.callbacks.delete(callback);
        if (existing.callbacks.size === 0) {
          this.unsubscribe(key);
        }
      };
    }

    const channelName = `${config.table}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    const eventType = config.event || '*';
    const schemaConfig: any = {
      event: eventType,
      schema: 'public',
      table: config.table
    };

    if (config.filter) {
      schemaConfig.filter = config.filter;
    }

    if (config.businessId) {
      schemaConfig.filter = `business_id=eq.${config.businessId}`;
    }

    channel.on('postgres_changes', schemaConfig, (payload: any) => {
      const subscription = this.subscriptions.get(key);
      if (!subscription) return;

      const wrappedCallback = () => {
        subscription.callbacks.forEach(cb => {
          try {
            cb(payload);
          } catch (error) {
            logger.error('[SubscriptionManager] Callback error', { error, key });
          }
        });
      };

      if (config.debounceMs && config.debounceMs > 0) {
        const existingTimer = this.debounceTimers.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const timer = setTimeout(wrappedCallback, config.debounceMs);
        this.debounceTimers.set(key, timer);
      } else {
        wrappedCallback();
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('[SubscriptionManager] Subscribed', { key, table: config.table });
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('[SubscriptionManager] Channel error', { key });
      }
    });

    const callbacks = new Set<SubscriptionCallback>();
    callbacks.add(callback);

    this.subscriptions.set(key, {
      channel,
      callbacks,
      config
    });

    logger.info('[SubscriptionManager] Created new subscription', { key });

    return () => {
      const sub = this.subscriptions.get(key);
      if (sub) {
        sub.callbacks.delete(callback);
        if (sub.callbacks.size === 0) {
          this.unsubscribe(key);
        }
      }
    };
  }

  private unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (!subscription) return;

    const timer = this.debounceTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(key);
    }

    subscription.channel.unsubscribe();
    this.subscriptions.delete(key);

    logger.info('[SubscriptionManager] Unsubscribed', { key });
  }

  cleanupAll(): void {
    logger.info('[SubscriptionManager] Cleaning up all subscriptions', {
      count: this.subscriptions.size
    });

    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    this.subscriptions.forEach((sub) => {
      sub.channel.unsubscribe();
    });
    this.subscriptions.clear();
  }

  cleanupByBusinessId(businessId: string): void {
    const keysToRemove: string[] = [];

    this.subscriptions.forEach((sub, key) => {
      if (sub.config.businessId === businessId) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => this.unsubscribe(key));

    logger.info('[SubscriptionManager] Cleaned up business subscriptions', {
      businessId,
      count: keysToRemove.length
    });
  }

  getStats(): {
    activeSubscriptions: number;
    totalCallbacks: number;
    subscriptionKeys: string[];
  } {
    let totalCallbacks = 0;
    this.subscriptions.forEach(sub => {
      totalCallbacks += sub.callbacks.size;
    });

    return {
      activeSubscriptions: this.subscriptions.size,
      totalCallbacks,
      subscriptionKeys: Array.from(this.subscriptions.keys())
    };
  }
}

export const subscriptionManager = new SubscriptionManager();

export function useRealtimeSubscription<T = any>(
  supabase: any | null,
  config: SubscriptionConfig,
  callback: SubscriptionCallback<T>,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled || !supabase) return;

    const unsubscribe = subscriptionManager.subscribe(supabase, config, callback);

    return () => {
      unsubscribe();
    };
  }, [supabase, config.table, config.event, config.filter, config.businessId, config.debounceMs, enabled]);
}
