import { queryCache } from './QueryCache';
import { DomainEvents } from '@/domain/events/DomainEvents';
import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';

export type HydrationRule = string[];

export const hydrationRules: Record<string, HydrationRule> = {
  'order.created': [
    'orders:list:*',
    'orders:page:*',
    'dashboard:*',
    'metrics:orders:*',
  ],
  'order.assigned': [
    'orders:list:*',
    'orders:detail:*',
    'orders:page:*',
    'drivers:detail:*',
    'drivers:orders:*',
  ],
  'order.status_updated': [
    'orders:list:*',
    'orders:detail:*',
    'orders:page:*',
    'drivers:orders:*',
    'dashboard:*',
  ],
  'order.cancelled': [
    'orders:list:*',
    'orders:detail:*',
    'orders:page:*',
    'dashboard:*',
  ],
  'driver.shift_started': [
    'drivers:list',
    'drivers:available',
    'drivers:detail:*',
    'dashboard:drivers:*',
  ],
  'driver.shift_ended': [
    'drivers:list',
    'drivers:available',
    'drivers:detail:*',
    'dashboard:drivers:*',
  ],
  'driver.location_updated': [
    'drivers:detail:*',
    'drivers:location:*',
  ],
  'delivery.accepted': [
    'orders:detail:*',
    'drivers:orders:*',
    'drivers:detail:*',
  ],
  'delivery.completed': [
    'orders:list:*',
    'orders:detail:*',
    'orders:page:*',
    'drivers:orders:*',
    'dashboard:*',
    'metrics:deliveries:*',
  ],
  'business.created': [
    'businesses:list',
    'businesses:page:*',
    'dashboard:*',
  ],
  'business.context_switched': [
    '*',
  ],
  'business.updated': [
    'businesses:list',
    'businesses:detail:*',
    'businesses:page:*',
  ],
  'product.created': [
    'products:list:*',
    'products:page:*',
    'catalog:*',
    'inventory:*',
  ],
  'product.updated': [
    'products:list:*',
    'products:detail:*',
    'products:page:*',
    'catalog:*',
    'inventory:*',
  ],
  'product.deleted': [
    'products:list:*',
    'products:page:*',
    'catalog:*',
    'inventory:*',
  ],
  'inventory.restocked': [
    'inventory:*',
    'products:detail:*',
    'products:list:*',
    'dashboard:inventory:*',
  ],
  'inventory.adjusted': [
    'inventory:*',
    'products:detail:*',
    'products:list:*',
  ],
  'inventory.reorder_level_set': [
    'inventory:*',
    'products:detail:*',
  ],
  'message.sent': [
    'conversations:*',
    'messages:*',
    'chat:*',
  ],
  'room.created': [
    'conversations:list',
    'conversations:page:*',
  ],
  'messages.marked_read': [
    'conversations:*',
    'messages:unread:*',
  ],
  'cart.item_added': [
    'cart:*',
  ],
  'cart.item_removed': [
    'cart:*',
  ],
  'cart.quantity_updated': [
    'cart:*',
  ],
  'cart.cleared': [
    'cart:*',
  ],
  'auth.login': [
    'user:profile',
    'user:businesses',
  ],
  'auth.register': [
    'user:profile',
  ],
  'auth.logout': [
    '*',
  ],
};

export class CacheHydrationService {
  private initialized = false;
  private unsubscribeFunctions: Array<() => void> = [];

  initialize(): void {
    if (this.initialized) {
      logger.warn('[CacheHydration] Already initialized');
      return;
    }

    logger.info('[CacheHydration] Initializing hydration rules');

    Object.entries(hydrationRules).forEach(([eventType, patterns]) => {
      const unsubscribe = DomainEvents.on(eventType, (event) => {
        this.handleEvent(eventType, patterns, event.payload);
      });

      this.unsubscribeFunctions.push(unsubscribe);
    });

    this.initialized = true;
    logger.info('[CacheHydration] Hydration rules initialized', {
      ruleCount: Object.keys(hydrationRules).length,
    });
  }

  private handleEvent(eventType: string, patterns: string[], payload: any): void {
    patterns.forEach(pattern => {
      if (pattern === '*') {
        queryCache.clearAll();

        DiagnosticsStore.logEvent({
          type: 'log',
          message: '[Cache Hydration] Clear All',
          data: { event: eventType },
        });

        logger.info('[CacheHydration] Cleared all cache', { event: eventType });
      } else {
        queryCache.clearPattern(pattern);

        DiagnosticsStore.logEvent({
          type: 'log',
          message: '[Cache Hydration] Pattern Clear',
          data: { event: eventType, pattern },
        });

        logger.debug('[CacheHydration] Cleared pattern', {
          event: eventType,
          pattern,
        });
      }
    });
  }

  addRule(eventType: string, patterns: string[]): void {
    if (hydrationRules[eventType]) {
      hydrationRules[eventType] = [
        ...new Set([...hydrationRules[eventType], ...patterns]),
      ];
    } else {
      hydrationRules[eventType] = patterns;

      if (this.initialized) {
        const unsubscribe = DomainEvents.on(eventType, (event) => {
          this.handleEvent(eventType, patterns, event.payload);
        });

        this.unsubscribeFunctions.push(unsubscribe);
      }
    }

    logger.debug('[CacheHydration] Added rule', { eventType, patterns });
  }

  removeRule(eventType: string): void {
    delete hydrationRules[eventType];
    logger.debug('[CacheHydration] Removed rule', { eventType });
  }

  reset(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    this.initialized = false;

    logger.info('[CacheHydration] Reset');
  }

  getRules(): Record<string, HydrationRule> {
    return { ...hydrationRules };
  }
}

export const cacheHydration = new CacheHydrationService();
