export interface DomainEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}

type EventHandler<T = any> = (event: DomainEvent<T>) => void;

class DomainEventBus {
  private handlers: Map<string, Set<EventHandler>>;

  constructor() {
    this.handlers = new Map();
  }

  on<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlers = this.handlers.get(eventType)!;
    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  emit<T = any>(event: DomainEvent<T>): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in domain event handler for ${event.type}:`, error);
        }
      });
    }
  }

  off(eventType: string, handler?: EventHandler): void {
    if (!handler) {
      this.handlers.delete(eventType);
      return;
    }

    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const DomainEvents = new DomainEventBus();
