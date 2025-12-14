import { IFeatureFlags, FeatureFlag } from '../abstractions/IFeatureFlags';
import { logger } from '../../lib/logger';

type Subscriber = (enabled: boolean) => void;
type AllSubscriber = (flags: Record<string, boolean>) => void;

export class FeatureFlagEngine implements IFeatureFlags {
  private flags: Map<string, boolean> = new Map();
  private subscribers: Map<string, Set<Subscriber>> = new Map();
  private allSubscribers: Set<AllSubscriber> = new Set();
  private storageKey = 'feature-flags';

  constructor() {
    this.loadFromStorage();
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  enable(key: string): void {
    this.setFlag(key, true);
  }

  disable(key: string): void {
    this.setFlag(key, false);
  }

  toggle(key: string): void {
    const current = this.isEnabled(key);
    this.setFlag(key, !current);
  }

  getAll(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }

  subscribe(key: string, callback: Subscriber): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    this.subscribers.get(key)!.add(callback);

    callback(this.isEnabled(key));

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  subscribeAll(callback: AllSubscriber): () => void {
    this.allSubscribers.add(callback);

    callback(this.getAll());

    return () => {
      this.allSubscribers.delete(callback);
    };
  }

  registerFlag(key: string, defaultValue: boolean = false, metadata?: FeatureFlag['metadata']): void {
    if (!this.flags.has(key)) {
      this.flags.set(key, defaultValue);
      logger.info(`[FeatureFlags] Registered flag: ${key}`, { defaultValue, metadata });
    }
  }

  private setFlag(key: string, enabled: boolean): void {
    const previous = this.flags.get(key);
    this.flags.set(key, enabled);

    logger.info(`[FeatureFlags] ${key}: ${enabled}`, { previous });

    this.saveToStorage();

    const keySubscribers = this.subscribers.get(key);
    if (keySubscribers) {
      keySubscribers.forEach((callback) => {
        try {
          callback(enabled);
        } catch (error) {
          logger.error(`[FeatureFlags] Subscriber error for ${key}`, error);
        }
      });
    }

    this.allSubscribers.forEach((callback) => {
      try {
        callback(this.getAll());
      } catch (error) {
        logger.error('[FeatureFlags] All-subscriber error', error);
      }
    });
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.flags.set(key, value as boolean);
        });
        logger.debug('[FeatureFlags] Loaded from storage', this.getAll());
      }
    } catch (error) {
      logger.error('[FeatureFlags] Failed to load from storage', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = this.getAll();
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.error('[FeatureFlags] Failed to save to storage', error);
    }
  }
}

export const featureFlagEngine = new FeatureFlagEngine();
