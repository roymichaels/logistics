import { getIndexedDB, IndexedDBStore } from '../indexedDBStore';
import { logger } from '../logger';

export type ConflictResolutionStrategy =
  | 'local-wins'
  | 'remote-wins'
  | 'latest-wins'
  | 'manual'
  | 'merge-deep';

export interface SyncRecord {
  id: string;
  storeName: string;
  docId: string;
  operation: 'create' | 'update' | 'delete';
  data?: any;
  version: number;
  timestamp: string;
  synced: boolean;
  conflictResolved?: boolean;
}

export interface ConflictInfo {
  docId: string;
  storeName: string;
  localVersion: any;
  remoteVersion: any;
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface SyncResult {
  synced: number;
  conflicts: ConflictInfo[];
  errors: Array<{ docId: string; error: string }>;
}

export class SyncEngine {
  private db: IndexedDBStore | null = null;
  private readonly SYNC_LOG_STORE = 'sync_log';
  private readonly CONFLICT_STORE = 'sync_conflicts';
  private conflictStrategy: ConflictResolutionStrategy = 'latest-wins';

  constructor(strategy?: ConflictResolutionStrategy) {
    if (strategy) {
      this.conflictStrategy = strategy;
    }
  }

  private async ensureDB(): Promise<IndexedDBStore> {
    if (!this.db) {
      this.db = await getIndexedDB();
    }
    return this.db;
  }

  async trackChange(
    storeName: string,
    docId: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    const db = await this.ensureDB();

    const syncRecord: SyncRecord = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      storeName,
      docId,
      operation,
      data,
      version: Date.now(),
      timestamp: new Date().toISOString(),
      synced: false
    };

    await db.put(this.SYNC_LOG_STORE, syncRecord);
    logger.debug('[SyncEngine] Tracked change', { storeName, docId, operation });
  }

  async getPendingChanges(storeName?: string): Promise<SyncRecord[]> {
    const db = await this.ensureDB();
    const allRecords = await db.getAll<SyncRecord>(this.SYNC_LOG_STORE);

    let pending = allRecords.filter((record) => !record.synced);

    if (storeName) {
      pending = pending.filter((record) => record.storeName === storeName);
    }

    return pending.sort((a, b) => a.version - b.version);
  }

  async markSynced(syncRecordId: string): Promise<void> {
    const db = await this.ensureDB();
    const record = await db.get<SyncRecord>(this.SYNC_LOG_STORE, syncRecordId);

    if (record) {
      record.synced = true;
      await db.put(this.SYNC_LOG_STORE, record);
    }
  }

  async resolveConflict(
    local: any,
    remote: any,
    strategy?: ConflictResolutionStrategy
  ): Promise<any> {
    const actualStrategy = strategy || this.conflictStrategy;

    switch (actualStrategy) {
      case 'local-wins':
        return local;

      case 'remote-wins':
        return remote;

      case 'latest-wins':
        const localTime = new Date(local.updated_at || local.createdAt || 0).getTime();
        const remoteTime = new Date(remote.updated_at || remote.createdAt || 0).getTime();
        return remoteTime > localTime ? remote : local;

      case 'merge-deep':
        return this.deepMerge(local, remote);

      case 'manual':
        await this.saveConflict(local, remote);
        throw new Error('Manual conflict resolution required');

      default:
        return local;
    }
  }

  private deepMerge(target: any, source: any): any {
    if (!this.isObject(target) || !this.isObject(source)) {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          const sourceTime = new Date(source.updated_at || 0).getTime();
          const targetTime = new Date(target.updated_at || 0).getTime();
          result[key] = sourceTime > targetTime ? source[key] : target[key];
        }
      }
    }

    return result;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  private async saveConflict(local: any, remote: any): Promise<void> {
    const db = await this.ensureDB();

    const conflict: ConflictInfo = {
      docId: local.id || remote.id,
      storeName: 'unknown',
      localVersion: local,
      remoteVersion: remote,
      localTimestamp: new Date(local.updated_at || local.createdAt || Date.now()).toISOString(),
      remoteTimestamp: new Date(remote.updated_at || remote.createdAt || Date.now()).toISOString()
    };

    await db.put(this.CONFLICT_STORE, {
      id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ...conflict,
      createdAt: new Date().toISOString()
    });

    logger.warn('[SyncEngine] Saved conflict for manual resolution', { docId: conflict.docId });
  }

  async getConflicts(): Promise<ConflictInfo[]> {
    const db = await this.ensureDB();
    return await db.getAll<ConflictInfo>(this.CONFLICT_STORE);
  }

  async resolveManualConflict(conflictId: string, resolution: any): Promise<void> {
    const db = await this.ensureDB();
    await db.delete(this.CONFLICT_STORE, conflictId);
    logger.info('[SyncEngine] Manually resolved conflict', { conflictId });
  }

  async mergeDocs(local: any, remote: any): Promise<any> {
    if (!local) return remote;
    if (!remote) return local;

    const merged = { ...local };

    if (local.updated_at && remote.updated_at) {
      const localTime = new Date(local.updated_at).getTime();
      const remoteTime = new Date(remote.updated_at).getTime();

      if (remoteTime > localTime) {
        Object.assign(merged, remote);
      }
    } else {
      Object.assign(merged, remote);
    }

    merged.updated_at = new Date().toISOString();
    merged.synced_at = new Date().toISOString();

    return merged;
  }

  async sync(
    storeName: string,
    remoteData: any[],
    strategy?: ConflictResolutionStrategy
  ): Promise<SyncResult> {
    const db = await this.ensureDB();
    const result: SyncResult = {
      synced: 0,
      conflicts: [],
      errors: []
    };

    const localDocs = await db.getAll<any>(storeName);
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc]));

    for (const remoteDoc of remoteData) {
      const docId = remoteDoc.id;
      const localDoc = localMap.get(docId);

      try {
        if (!localDoc) {
          await db.put(storeName, remoteDoc);
          result.synced++;
        } else {
          try {
            const resolved = await this.resolveConflict(localDoc, remoteDoc, strategy);
            await db.put(storeName, resolved);
            result.synced++;
          } catch (error) {
            if ((error as Error).message.includes('Manual conflict')) {
              result.conflicts.push({
                docId,
                storeName,
                localVersion: localDoc,
                remoteVersion: remoteDoc,
                localTimestamp: localDoc.updated_at || localDoc.createdAt || new Date().toISOString(),
                remoteTimestamp: remoteDoc.updated_at || remoteDoc.createdAt || new Date().toISOString()
              });
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        result.errors.push({
          docId,
          error: (error as Error).message
        });
      }
    }

    logger.info('[SyncEngine] Sync completed', {
      storeName,
      synced: result.synced,
      conflicts: result.conflicts.length,
      errors: result.errors.length
    });

    return result;
  }

  async clearSyncLog(olderThan?: Date): Promise<number> {
    const db = await this.ensureDB();
    const allRecords = await db.getAll<SyncRecord>(this.SYNC_LOG_STORE);

    let toDelete = allRecords.filter((record) => record.synced);

    if (olderThan) {
      toDelete = toDelete.filter((record) => new Date(record.timestamp) < olderThan);
    }

    for (const record of toDelete) {
      await db.delete(this.SYNC_LOG_STORE, record.id);
    }

    logger.info(`[SyncEngine] Cleared ${toDelete.length} sync log entries`);
    return toDelete.length;
  }

  async getSyncStats(): Promise<{
    pending: number;
    synced: number;
    conflicts: number;
    byStore: Record<string, { pending: number; synced: number }>;
  }> {
    const db = await this.ensureDB();
    const allRecords = await db.getAll<SyncRecord>(this.SYNC_LOG_STORE);
    const conflicts = await this.getConflicts();

    const pending = allRecords.filter((r) => !r.synced).length;
    const synced = allRecords.filter((r) => r.synced).length;

    const byStore: Record<string, { pending: number; synced: number }> = {};

    for (const record of allRecords) {
      if (!byStore[record.storeName]) {
        byStore[record.storeName] = { pending: 0, synced: 0 };
      }

      if (record.synced) {
        byStore[record.storeName].synced++;
      } else {
        byStore[record.storeName].pending++;
      }
    }

    return {
      pending,
      synced,
      conflicts: conflicts.length,
      byStore
    };
  }
}

let globalSyncEngine: SyncEngine | null = null;

export function getSyncEngine(strategy?: ConflictResolutionStrategy): SyncEngine {
  if (!globalSyncEngine) {
    globalSyncEngine = new SyncEngine(strategy);
  }
  return globalSyncEngine;
}

export function resetSyncEngine(): void {
  globalSyncEngine = null;
}

logger.info('[SyncEngine] Module loaded');
