import { PlatformEvent, EventHandler, EventSubscription } from '../types/Events';
import { logger } from '../../lib/logger';
import { DiagnosticsStore } from '../diagnostics/DiagnosticsStore';

class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private globalSubscribers: Set<EventHandler> = new Set();
  private eventHistory: PlatformEvent[] = [];
  private maxHistorySize = 100;

  emit<T extends PlatformEvent>(event: T): void {
    this.addToHistory(event);

    logger.info(`[EventBus] Emitting event: ${event.type}`, {
      eventType: event.eventType,
      source: event.source,
    });

    // Diagnostic logging
    try {
      DiagnosticsStore.logEvent({
        type: 'log',
        message: `Event emitted: ${event.type}`,
        data: { eventType: event.eventType, source: event.source },
      });
    } catch (e) {
      // Silently ignore if diagnostics not available
    }

    const typeSubscribers = this.subscribers.get(event.type) || new Set();
    const allSubscribers = [...typeSubscribers, ...this.globalSubscribers];

    allSubscribers.forEach((handler) => {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch((error) => {
            logger.error(`[EventBus] Handler error for ${event.type}`, error);
          });
        }
      } catch (error) {
        logger.error(`[EventBus] Handler error for ${event.type}`, error);
      }
    });
  }

  subscribe<T extends PlatformEvent = PlatformEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): EventSubscription {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }

    const handlers = this.subscribers.get(eventType)!;
    handlers.add(handler as EventHandler);

    logger.debug(`[EventBus] Subscribed to event: ${eventType}`);

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler);
        if (handlers.size === 0) {
          this.subscribers.delete(eventType);
        }
        logger.debug(`[EventBus] Unsubscribed from event: ${eventType}`);
      },
    };
  }

  subscribeAll(handler: EventHandler): EventSubscription {
    this.globalSubscribers.add(handler);

    logger.debug(`[EventBus] Subscribed to all events`);

    return {
      unsubscribe: () => {
        this.globalSubscribers.delete(handler);
        logger.debug(`[EventBus] Unsubscribed from all events`);
      },
    };
  }

  getHistory(filter?: { type?: string; eventType?: string; limit?: number }): PlatformEvent[] {
    let filtered = [...this.eventHistory];

    if (filter?.type) {
      filtered = filtered.filter((e) => e.type === filter.type);
    }

    if (filter?.eventType) {
      filtered = filtered.filter((e) => e.eventType === filter.eventType);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  clear(): void {
    this.subscribers.clear();
    this.globalSubscribers.clear();
    this.eventHistory = [];
    logger.info(`[EventBus] Cleared all subscribers and history`);
  }

  private addToHistory(event: PlatformEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
}

export const eventBus = new EventBus();
