import { queryCache } from '../cache/QueryCache';
import { DiagnosticsStore } from '@/foundation/diagnostics/DiagnosticsStore';
import { logger } from '@/lib/logger';

export interface OptimisticUpdate {
  id: string;
  key: string;
  previousValue: any;
  newValue: any;
  timestamp: number;
  committed: boolean;
}

export class OptimisticManager {
  private updates = new Map<string, OptimisticUpdate>();
  private updateCounter = 0;

  applyOptimistic(key: string, updater: (draft: any) => any): string {
    const updateId = `optimistic_${this.updateCounter++}_${Date.now()}`;

    const currentValue = queryCache.get(key);
    const previousValue = currentValue ? JSON.parse(JSON.stringify(currentValue)) : null;

    let newValue: any;
    try {
      if (previousValue !== null) {
        newValue = updater(JSON.parse(JSON.stringify(previousValue)));
      } else {
        newValue = updater(null);
      }

      queryCache.set(key, newValue, 60000);

      const update: OptimisticUpdate = {
        id: updateId,
        key,
        previousValue,
        newValue,
        timestamp: Date.now(),
        committed: false,
      };

      this.updates.set(updateId, update);

      DiagnosticsStore.logEvent({
        type: 'log',
        message: '[Optimistic] Update Applied',
        data: { updateId, key },
      });

      logger.debug('[OptimisticManager] Applied', { updateId, key });

      return updateId;
    } catch (error) {
      logger.error('[OptimisticManager] Apply failed', { key, error });
      throw error;
    }
  }

  revert(updateId: string): void {
    const update = this.updates.get(updateId);

    if (!update) {
      logger.warn('[OptimisticManager] Update not found', { updateId });
      return;
    }

    if (update.previousValue !== null) {
      queryCache.set(update.key, update.previousValue, 60000);
    } else {
      queryCache.clear(update.key);
    }

    this.updates.delete(updateId);

    DiagnosticsStore.logEvent({
      type: 'error',
      message: '[Optimistic] Rollback',
      data: { updateId, key: update.key },
    });

    logger.debug('[OptimisticManager] Reverted', { updateId, key: update.key });
  }

  commit(updateId: string): void {
    const update = this.updates.get(updateId);

    if (!update) {
      logger.warn('[OptimisticManager] Update not found', { updateId });
      return;
    }

    update.committed = true;

    this.updates.delete(updateId);

    DiagnosticsStore.logEvent({
      type: 'log',
      message: '[Optimistic] Commit',
      data: { updateId, key: update.key },
    });

    logger.debug('[OptimisticManager] Committed', { updateId, key: update.key });
  }

  getPending(): OptimisticUpdate[] {
    return Array.from(this.updates.values()).filter(u => !u.committed);
  }

  revertAll(): void {
    const updateIds = Array.from(this.updates.keys());
    updateIds.forEach(id => this.revert(id));

    logger.info('[OptimisticManager] Reverted all', { count: updateIds.length });
  }

  clear(): void {
    this.updates.clear();
    logger.info('[OptimisticManager] Cleared');
  }

  getUpdate(updateId: string): OptimisticUpdate | undefined {
    return this.updates.get(updateId);
  }

  hasUpdate(updateId: string): boolean {
    return this.updates.has(updateId);
  }
}

export const optimisticManager = new OptimisticManager();
