export interface BaseEvent {
  type: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface DomainEvent extends BaseEvent {
  eventType: 'domain';
  aggregateId: string;
  aggregateType: string;
  payload: unknown;
}

export interface SystemEvent extends BaseEvent {
  eventType: 'system';
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface UIEvent extends BaseEvent {
  eventType: 'ui';
  component: string;
  action: string;
  payload?: unknown;
}

export type PlatformEvent = DomainEvent | SystemEvent | UIEvent;

export interface EventSubscription {
  unsubscribe: () => void;
}

export type EventHandler<T extends PlatformEvent = PlatformEvent> = (event: T) => void | Promise<void>;
