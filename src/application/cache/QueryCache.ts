import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  totalKeys: number;
  memoryHits: number;
  memoryMisses: number;
  hitRate: number;
  persistentKeys: number;
}

export class QueryCache {
  private memory = new Map<string, CacheEntry>();
  private timestamps = new Map<string, number>();
  private memoryHits = 0;
  private memoryMisses = 0;
  private maxMemorySize = 500;

  get(key: string): any | null {
    const entry = this.memory.get(key);

    if (entry) {
      this.memoryHits++;
      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Cache] Hit',
        data: { key, age: Date.now() - entry.timestamp },
      });
      logger.debug('[QueryCache] Hit', { key });
      return entry.data;
    }

    this.memoryMisses++;
    DiagnosticsStore.logEvent({
      type: 'log',
      message: '[Cache] Miss',
      data: { key },
    });
    logger.debug('[QueryCache] Miss', { key });
    return null;
  }

  set(key: string, data: any, ttl: number = 60000): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.memory.set(key, entry);
    this.timestamps.set(key, Date.now());

    this.evictIfNeeded();

    logger.debug('[QueryCache] Set', { key, ttl });
  }

  isStale(key: string, ttl: number): boolean {
    const entry = this.memory.get(key);
    if (!entry) return true;

    const age = Date.now() - entry.timestamp;
    const isStale = age > (entry.ttl || ttl);

    if (isStale) {
      logger.debug('[QueryCache] Stale', { key, age, ttl: entry.ttl });
    }

    return isStale;
  }

  clear(key: string): void {
    this.memory.delete(key);
    this.timestamps.delete(key);

    DiagnosticsStore.logEvent({
      type: 'log',
      message: '[Cache] Invalidate',
      data: { key },
    });

    logger.debug('[QueryCache] Clear', { key });
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete: string[] = [];

    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.memory.delete(key);
      this.timestamps.delete(key);
    });

    if (keysToDelete.length > 0) {
      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Cache] Pattern Invalidate',
        data: { pattern, keysCleared: keysToDelete.length, keys: keysToDelete },
      });

      logger.debug('[QueryCache] Clear pattern', { pattern, count: keysToDelete.length });
    }
  }

  clearAll(): void {
    const count = this.memory.size;
    this.memory.clear();
    this.timestamps.clear();

    DiagnosticsStore.logEvent({
      type: 'log',
      message: '[Cache] Clear All',
      data: { keysCleared: count },
    });

    logger.info('[QueryCache] Cleared all', { count });
  }

  update(keyPattern: string, updater: (draft: any) => any): void {
    const regex = new RegExp(keyPattern.replace(/\*/g, '.*'));

    for (const [key, entry] of this.memory.entries()) {
      if (regex.test(key)) {
        try {
          const updated = updater(entry.data);
          entry.data = updated;
          entry.timestamp = Date.now();

          logger.debug('[QueryCache] Update', { key });
        } catch (error) {
          logger.error('[QueryCache] Update failed', { key, error });
        }
      }
    }
  }

  getStats(): CacheStats {
    const total = this.memoryHits + this.memoryMisses;
    const hitRate = total > 0 ? (this.memoryHits / total) * 100 : 0;

    return {
      totalKeys: this.memory.size,
      memoryHits: this.memoryHits,
      memoryMisses: this.memoryMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      persistentKeys: 0,
    };
  }

  resetStats(): void {
    this.memoryHits = 0;
    this.memoryMisses = 0;
    logger.info('[QueryCache] Stats reset');
  }

  private evictIfNeeded(): void {
    if (this.memory.size <= this.maxMemorySize) return;

    const sortedEntries = Array.from(this.timestamps.entries())
      .sort((a, b) => a[1] - b[1]);

    const toEvict = sortedEntries.slice(0, Math.floor(this.maxMemorySize * 0.2));

    toEvict.forEach(([key]) => {
      this.memory.delete(key);
      this.timestamps.delete(key);
    });

    logger.debug('[QueryCache] Evicted', { count: toEvict.length });
  }

  getAllKeys(): string[] {
    return Array.from(this.memory.keys());
  }
}

export const queryCache = new QueryCache();
