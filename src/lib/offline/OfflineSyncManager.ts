import { logger } from '../logger';
import { offlineStore } from '../../utils/offlineStore';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  errorMessage: string | null;
}

export interface SyncProgress {
  current: number;
  total: number;
  currentOperation: string;
}

class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private syncState: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingCount: 0,
    errorMessage: null
  };
  private listeners: Set<(state: SyncState) => void> = new Set();
  private progressListeners: Set<(progress: SyncProgress) => void> = new Set();
  private isSyncing: boolean = false;
  private autoSyncEnabled: boolean = true;

  private constructor() {
    this.setupNetworkListeners();
    this.loadState();
  }

  static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      logger.info('🌐 Network connection restored');
      if (this.autoSyncEnabled) {
        this.sync();
      }
    });

    window.addEventListener('offline', () => {
      logger.warn('📵 Network connection lost');
      this.updateState({ status: 'idle' });
    });
  }

  private loadState() {
    try {
      const saved = localStorage.getItem('offline_sync_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.syncState = { ...this.syncState, ...parsed };
      }
    } catch (error) {
      logger.error('Failed to load sync state', error as Error);
    }
  }

  private saveState() {
    try {
      localStorage.setItem('offline_sync_state', JSON.stringify(this.syncState));
    } catch (error) {
      logger.error('Failed to save sync state', error as Error);
    }
  }

  private updateState(updates: Partial<SyncState>) {
    this.syncState = { ...this.syncState, ...updates };
    this.saveState();
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.syncState));
  }

  private notifyProgress(progress: SyncProgress) {
    this.progressListeners.forEach(listener => listener(progress));
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.syncState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeToProgress(listener: (progress: SyncProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  getState(): SyncState {
    return { ...this.syncState };
  }

  async getPendingCount(): Promise<number> {
    try {
      const diagnostics = await offlineStore.getDiagnostics();
      return diagnostics.mutations.pending;
    } catch (error) {
      logger.error('Failed to get pending count', error as Error);
      return 0;
    }
  }

  async sync(): Promise<boolean> {
    if (this.isSyncing) {
      logger.info('⏭️ Sync already in progress, skipping');
      return false;
    }

    if (!navigator.onLine) {
      logger.warn('📵 Cannot sync while offline');
      this.updateState({ status: 'error', errorMessage: 'No network connection' });
      return false;
    }

    this.isSyncing = true;
    this.updateState({ status: 'syncing', errorMessage: null });

    logger.info('🔄 Starting offline sync...');

    try {
      const diagnostics = await offlineStore.getDiagnostics();
      const totalPending = diagnostics.mutations.pending;

      if (totalPending === 0) {
        logger.info('✅ No pending mutations to sync');
        this.updateState({
          status: 'success',
          lastSyncedAt: new Date().toISOString(),
          pendingCount: 0
        });
        this.isSyncing = false;
        return true;
      }

      logger.info(`📤 Syncing ${totalPending} pending mutations...`);

      this.notifyProgress({
        current: 0,
        total: totalPending,
        currentOperation: 'Starting sync...'
      });

      await offlineStore.flushMutations();

      const finalDiagnostics = await offlineStore.getDiagnostics();
      const remainingPending = finalDiagnostics.mutations.pending;

      if (remainingPending > 0) {
        logger.warn(`⚠️ Sync completed with ${remainingPending} remaining mutations`);
        this.updateState({
          status: 'error',
          lastSyncedAt: new Date().toISOString(),
          pendingCount: remainingPending,
          errorMessage: `${remainingPending} operations could not be synced`
        });
        this.isSyncing = false;
        return false;
      }

      logger.info('✅ Offline sync completed successfully');
      this.updateState({
        status: 'success',
        lastSyncedAt: new Date().toISOString(),
        pendingCount: 0,
        errorMessage: null
      });

      this.isSyncing = false;
      return true;
    } catch (error) {
      logger.error('❌ Offline sync failed', error as Error);
      this.updateState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      this.isSyncing = false;
      return false;
    }
  }

  setAutoSync(enabled: boolean) {
    this.autoSyncEnabled = enabled;
    logger.info(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  async clearPendingOperations(): Promise<void> {
    try {
      await offlineStore.clearAll();
      this.updateState({
        status: 'idle',
        pendingCount: 0,
        errorMessage: null
      });
      logger.info('🗑️ Cleared all pending operations');
    } catch (error) {
      logger.error('Failed to clear pending operations', error as Error);
      throw error;
    }
  }

  async retryFailed(): Promise<boolean> {
    logger.info('🔄 Retrying failed operations...');
    return this.sync();
  }
}

export const offlineSyncManager = OfflineSyncManager.getInstance();
