import { logger } from '@/lib/logger';

const CACHE_PREFIX = 'qc_';
const EXPIRY_KEY = 'qc_expiry';

export interface PersistentCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export class PersistentCache {
  private enabled: boolean;

  constructor() {
    this.enabled = this.checkAvailability();
    if (this.enabled) {
      this.clearExpired();
    }
  }

  async save(key: string, data: any, ttl: number = 60000): Promise<void> {
    if (!this.enabled) return;

    try {
      const entry: PersistentCacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      const storageKey = CACHE_PREFIX + key;
      localStorage.setItem(storageKey, JSON.stringify(entry));

      this.updateExpiryIndex(key, Date.now() + ttl);

      logger.debug('[PersistentCache] Saved', { key, ttl });
    } catch (error) {
      if (this.isQuotaError(error)) {
        logger.warn('[PersistentCache] Quota exceeded, clearing old entries');
        this.clearOldest(10);
        try {
          const entry: PersistentCacheEntry = {
            data,
            timestamp: Date.now(),
            ttl,
          };
          localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        } catch (retryError) {
          logger.error('[PersistentCache] Save failed after cleanup', retryError);
        }
      } else {
        logger.error('[PersistentCache] Save failed', { key, error });
      }
    }
  }

  async load(key: string): Promise<any | null> {
    if (!this.enabled) return null;

    try {
      const storageKey = CACHE_PREFIX + key;
      const raw = localStorage.getItem(storageKey);

      if (!raw) return null;

      const entry: PersistentCacheEntry = JSON.parse(raw);

      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        this.remove(key);
        return null;
      }

      logger.debug('[PersistentCache] Loaded', { key, age });
      return entry.data;
    } catch (error) {
      logger.error('[PersistentCache] Load failed', { key, error });
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const storageKey = CACHE_PREFIX + key;
      localStorage.removeItem(storageKey);
      this.removeFromExpiryIndex(key);

      logger.debug('[PersistentCache] Removed', { key });
    } catch (error) {
      logger.error('[PersistentCache] Remove failed', { key, error });
    }
  }

  async clearExpired(): Promise<void> {
    if (!this.enabled) return;

    try {
      const expiryIndex = this.getExpiryIndex();
      const now = Date.now();
      let clearedCount = 0;

      for (const [key, expiryTime] of Object.entries(expiryIndex)) {
        if (expiryTime < now) {
          this.remove(key);
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        logger.info('[PersistentCache] Cleared expired', { count: clearedCount });
      }
    } catch (error) {
      logger.error('[PersistentCache] Clear expired failed', error);
    }
  }

  async clearAll(): Promise<void> {
    if (!this.enabled) return;

    try {
      const keys = Object.keys(localStorage);
      let clearedCount = 0;

      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      });

      localStorage.removeItem(EXPIRY_KEY);

      logger.info('[PersistentCache] Cleared all', { count: clearedCount });
    } catch (error) {
      logger.error('[PersistentCache] Clear all failed', error);
    }
  }

  getSize(): number {
    if (!this.enabled) return 0;

    const keys = Object.keys(localStorage);
    return keys.filter(key => key.startsWith(CACHE_PREFIX)).length;
  }

  private checkAvailability(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;

      const testKey = '__cache_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private isQuotaError(error: any): boolean {
    return (
      error instanceof DOMException &&
      (error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  private clearOldest(count: number): void {
    try {
      const expiryIndex = this.getExpiryIndex();
      const entries = Object.entries(expiryIndex)
        .sort((a, b) => a[1] - b[1])
        .slice(0, count);

      entries.forEach(([key]) => this.remove(key));

      logger.debug('[PersistentCache] Cleared oldest', { count: entries.length });
    } catch (error) {
      logger.error('[PersistentCache] Clear oldest failed', error);
    }
  }

  private getExpiryIndex(): Record<string, number> {
    try {
      const raw = localStorage.getItem(EXPIRY_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private updateExpiryIndex(key: string, expiryTime: number): void {
    try {
      const index = this.getExpiryIndex();
      index[key] = expiryTime;
      localStorage.setItem(EXPIRY_KEY, JSON.stringify(index));
    } catch (error) {
      logger.error('[PersistentCache] Update expiry index failed', error);
    }
  }

  private removeFromExpiryIndex(key: string): void {
    try {
      const index = this.getExpiryIndex();
      delete index[key];
      localStorage.setItem(EXPIRY_KEY, JSON.stringify(index));
    } catch (error) {
      logger.error('[PersistentCache] Remove from expiry index failed', error);
    }
  }
}

export const persistentCache = new PersistentCache();
