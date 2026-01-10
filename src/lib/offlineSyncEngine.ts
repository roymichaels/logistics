import { supabase } from './supabase';
import { logger } from './logger';
import { offlineStore } from '../utils/offlineStore';

interface PendingMutation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  serverData?: any;
  clientData?: any;
  resolvedData?: any;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
}

class OfflineSyncEngine {
  private isSyncing = false;
  private syncInterval: number | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds

  initialize(): void {
    this.setupNetworkListener();
    this.startPeriodicSync();

    logger.info('[OfflineSyncEngine] Initialized');
  }

  private setupNetworkListener(): void {
    window.addEventListener('online', () => {
      logger.info('[OfflineSyncEngine] Network online - triggering sync');
      void this.sync();
    });

    window.addEventListener('offline', () => {
      logger.info('[OfflineSyncEngine] Network offline');
    });
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        void this.sync();
      }
    }, this.SYNC_INTERVAL_MS);
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.warn('[OfflineSyncEngine] Sync already in progress');
      return { success: false, synced: 0, failed: 0, conflicts: 0 };
    }

    if (!navigator.onLine) {
      logger.warn('[OfflineSyncEngine] Cannot sync - offline');
      return { success: false, synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;

    try {
      logger.info('[OfflineSyncEngine] Starting sync');

      const mutations = await this.getPendingMutations();

      if (mutations.length === 0) {
        logger.info('[OfflineSyncEngine] No pending mutations');
        return { success: true, synced: 0, failed: 0, conflicts: 0 };
      }

      logger.info('[OfflineSyncEngine] Syncing mutations', { count: mutations.length });

      let synced = 0;
      let failed = 0;
      let conflicts = 0;

      for (const mutation of mutations) {
        try {
          const result = await this.syncMutation(mutation);

          if (result.success) {
            synced++;
            await this.markMutationComplete(mutation.id);
          } else if (result.conflict) {
            conflicts++;
            await this.handleConflict(mutation, result.conflictResolution);
          } else {
            failed++;
            await this.markMutationFailed(mutation.id, result.error);
          }
        } catch (error) {
          logger.error('[OfflineSyncEngine] Error syncing mutation', { mutation, error });
          failed++;
          await this.markMutationFailed(mutation.id, 'Unexpected error');
        }
      }

      logger.info('[OfflineSyncEngine] Sync completed', { synced, failed, conflicts });

      return {
        success: true,
        synced,
        failed,
        conflicts,
      };
    } catch (error) {
      logger.error('[OfflineSyncEngine] Sync failed', error);
      return { success: false, synced: 0, failed: 0, conflicts: 0 };
    } finally {
      this.isSyncing = false;
    }
  }

  private async getPendingMutations(): Promise<PendingMutation[]> {
    try {
      const mutations = await offlineStore.getAllMutations();
      return mutations
        .filter((m) => m.status === 'pending' && m.retryCount < this.MAX_RETRIES)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('[OfflineSyncEngine] Error getting pending mutations', error);
      return [];
    }
  }

  private async syncMutation(mutation: PendingMutation): Promise<{
    success: boolean;
    conflict?: boolean;
    conflictResolution?: ConflictResolution;
    error?: string;
  }> {
    logger.info('[OfflineSyncEngine] Syncing mutation', { type: mutation.type, id: mutation.id });

    try {
      switch (mutation.type) {
        case 'create_order':
          return await this.syncCreateOrder(mutation);

        case 'update_order':
          return await this.syncUpdateOrder(mutation);

        case 'complete_task':
          return await this.syncCompleteTask(mutation);

        case 'update_inventory':
          return await this.syncUpdateInventory(mutation);

        default:
          logger.warn('[OfflineSyncEngine] Unknown mutation type', { type: mutation.type });
          return { success: false, error: 'Unknown mutation type' };
      }
    } catch (error) {
      logger.error('[OfflineSyncEngine] Exception syncing mutation', { mutation, error });
      return { success: false, error: 'Exception during sync' };
    }
  }

  private async syncCreateOrder(mutation: PendingMutation): Promise<{
    success: boolean;
    conflict?: boolean;
    error?: string;
  }> {
    const { data: orderData } = mutation;

    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        logger.warn('[OfflineSyncEngine] Order already exists', { orderId: orderData.id });
        return { success: true };
      }

      logger.error('[OfflineSyncEngine] Error creating order', error);
      return { success: false, error: error.message };
    }

    logger.info('[OfflineSyncEngine] Order created', { orderId: data?.id });
    return { success: true };
  }

  private async syncUpdateOrder(mutation: PendingMutation): Promise<{
    success: boolean;
    conflict?: boolean;
    conflictResolution?: ConflictResolution;
    error?: string;
  }> {
    const { orderId, updates, clientTimestamp } = mutation.data;

    const { data: serverOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*, updated_at')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!serverOrder) {
      return { success: false, error: 'Order not found' };
    }

    const serverUpdatedAt = new Date(serverOrder.updated_at).getTime();

    if (serverUpdatedAt > clientTimestamp) {
      logger.warn('[OfflineSyncEngine] Conflict detected - server has newer version', {
        orderId,
        serverUpdatedAt,
        clientTimestamp,
      });

      return {
        success: false,
        conflict: true,
        conflictResolution: {
          strategy: 'server_wins',
          serverData: serverOrder,
          clientData: updates,
        },
      };
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    logger.info('[OfflineSyncEngine] Order updated', { orderId });
    return { success: true };
  }

  private async syncCompleteTask(mutation: PendingMutation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { taskId, driverId, completionData } = mutation.data;

    const { data, error } = await supabase
      .from('assignments')
      .update({
        status: 'completed',
        completed_at: completionData.completed_at,
        proof_of_delivery: completionData.proof_of_delivery || {},
      })
      .eq('id', taskId)
      .eq('driver_id', driverId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Task not found or already completed' };
    }

    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: completionData.completed_at,
      })
      .eq('id', data.order_id);

    if (orderError) {
      logger.error('[OfflineSyncEngine] Error updating order', orderError);
    }

    logger.info('[OfflineSyncEngine] Task completed', { taskId });
    return { success: true };
  }

  private async syncUpdateInventory(mutation: PendingMutation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { inventoryId, quantity, operation } = mutation.data;

    const { error } = await supabase.rpc('adjust_inventory', {
      p_inventory_id: inventoryId,
      p_quantity_change: operation === 'add' ? quantity : -quantity,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info('[OfflineSyncEngine] Inventory updated', { inventoryId });
    return { success: true };
  }

  private async handleConflict(
    mutation: PendingMutation,
    resolution?: ConflictResolution
  ): Promise<void> {
    if (!resolution) {
      logger.error('[OfflineSyncEngine] No conflict resolution provided');
      await this.markMutationFailed(mutation.id, 'Conflict - no resolution');
      return;
    }

    switch (resolution.strategy) {
      case 'server_wins':
        logger.info('[OfflineSyncEngine] Conflict resolved - server wins', {
          mutationId: mutation.id,
        });
        await this.markMutationComplete(mutation.id);
        break;

      case 'client_wins':
        logger.info('[OfflineSyncEngine] Conflict resolved - client wins', {
          mutationId: mutation.id,
        });
        await this.markMutationComplete(mutation.id);
        break;

      case 'manual':
        logger.warn('[OfflineSyncEngine] Manual conflict resolution required', {
          mutationId: mutation.id,
        });
        await this.markMutationFailed(mutation.id, 'Manual resolution required');
        break;

      default:
        logger.warn('[OfflineSyncEngine] Unknown conflict resolution strategy', {
          strategy: resolution.strategy,
        });
        await this.markMutationFailed(mutation.id, 'Unknown resolution strategy');
    }
  }

  private async markMutationComplete(mutationId: string): Promise<void> {
    try {
      await offlineStore.removeMutation(mutationId);
      logger.info('[OfflineSyncEngine] Mutation marked complete', { mutationId });
    } catch (error) {
      logger.error('[OfflineSyncEngine] Error marking mutation complete', error);
    }
  }

  private async markMutationFailed(mutationId: string, errorMessage: string): Promise<void> {
    try {
      await offlineStore.updateMutationStatus(mutationId, 'failed', errorMessage);
      logger.info('[OfflineSyncEngine] Mutation marked failed', { mutationId, errorMessage });
    } catch (error) {
      logger.error('[OfflineSyncEngine] Error marking mutation failed', error);
    }
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    logger.info('[OfflineSyncEngine] Destroyed');
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
