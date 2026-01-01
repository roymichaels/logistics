import type { IInventoryRepository } from '@/domain/inventory/repositories/IInventoryRepository';
import type { InventoryItem, RestockRequest, StockAdjustment } from '@/domain/inventory/entities';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export class InventoryRepository implements IInventoryRepository {
  constructor(private readonly dataStore: IDataStore) {}

  async getInventory(filters?: {
    business_id?: string;
    product_id?: string;
    location?: string;
  }): AsyncResult<InventoryItem[], ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Fetching inventory', { filters });

      let query = this.dataStore.from('inventory').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }
      if (filters?.location) {
        query = query.eq('warehouse_location', filters.location);
      }

      const result = await query.order('updated_at', { ascending: false });

      if (!result.success) {
        logger.error('[InventoryRepository] Failed to fetch inventory', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch inventory',
          code: 'INVENTORY_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as InventoryItem[]);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception fetching inventory', error);
      return Err({
        message: error.message || 'Unexpected error fetching inventory',
        code: 'INVENTORY_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getInventoryById(id: string): AsyncResult<InventoryItem | null, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Fetching inventory by ID', { id });

      const result = await this.dataStore
        .from('inventory')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!result.success) {
        logger.error('[InventoryRepository] Failed to fetch inventory item', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch inventory item',
          code: 'INVENTORY_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as InventoryItem | null);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception fetching inventory item', error);
      return Err({
        message: error.message || 'Unexpected error fetching inventory item',
        code: 'INVENTORY_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getLowStockItems(businessId: string): AsyncResult<InventoryItem[], ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Fetching low stock items', { businessId });

      const result = await this.dataStore
        .from('inventory')
        .select('*')
        .eq('business_id', businessId);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch low stock items',
          code: 'LOW_STOCK_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const items = (result.data as InventoryItem[]).filter(
        item => item.reorder_level && item.quantity <= item.reorder_level
      );

      return Ok(items);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception fetching low stock items', error);
      return Err({
        message: error.message || 'Unexpected error fetching low stock items',
        code: 'LOW_STOCK_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getOutOfStockItems(businessId: string): AsyncResult<InventoryItem[], ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Fetching out of stock items', { businessId });

      const result = await this.dataStore
        .from('inventory')
        .select('*')
        .eq('business_id', businessId)
        .eq('quantity', 0);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch out of stock items',
          code: 'OUT_OF_STOCK_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as InventoryItem[]);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception fetching out of stock items', error);
      return Err({
        message: error.message || 'Unexpected error fetching out of stock items',
        code: 'OUT_OF_STOCK_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createInventoryItem(
    item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
  ): AsyncResult<InventoryItem, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Creating inventory item', { item });

      const result = await this.dataStore
        .from('inventory')
        .insert(item)
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to create inventory item',
          code: 'INVENTORY_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdItem = result.data as InventoryItem;

      DomainEvents.emit({
        type: 'inventory.item_created',
        payload: { inventoryId: createdItem.id, productId: createdItem.product_id },
        timestamp: Date.now(),
      });

      return Ok(createdItem);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception creating inventory item', error);
      return Err({
        message: error.message || 'Unexpected error creating inventory item',
        code: 'INVENTORY_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async updateQuantity(id: string, quantity: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Updating quantity', { id, quantity });

      const result = await this.dataStore
        .from('inventory')
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to update quantity',
          code: 'QUANTITY_UPDATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.quantity_updated',
        payload: { inventoryId: id, newQuantity: quantity },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception updating quantity', error);
      return Err({
        message: error.message || 'Unexpected error updating quantity',
        code: 'QUANTITY_UPDATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async adjustStock(
    adjustment: Omit<StockAdjustment, 'id' | 'created_at'>
  ): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Adjusting stock', { adjustment });

      const getResult = await this.getInventoryById(adjustment.inventory_id);

      if (!getResult.success || !getResult.data) {
        return Err({
          message: 'Inventory item not found',
          code: 'INVENTORY_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const currentQuantity = getResult.data.quantity;
      const newQuantity = currentQuantity + adjustment.quantity_delta;

      if (newQuantity < 0) {
        return Err({
          message: 'Insufficient stock for adjustment',
          code: 'INSUFFICIENT_STOCK',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const updateResult = await this.updateQuantity(adjustment.inventory_id, newQuantity);

      if (!updateResult.success) {
        return updateResult;
      }

      const logResult = await this.dataStore
        .from('stock_adjustments')
        .insert(adjustment);

      if (!logResult.success) {
        logger.warn('[InventoryRepository] Failed to log stock adjustment', logResult.error);
      }

      DomainEvents.emit({
        type: 'inventory.stock_adjusted',
        payload: {
          inventoryId: adjustment.inventory_id,
          delta: adjustment.quantity_delta,
          reason: adjustment.reason,
          newQuantity,
        },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception adjusting stock', error);
      return Err({
        message: error.message || 'Unexpected error adjusting stock',
        code: 'STOCK_ADJUST_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async reserveStock(id: string, quantity: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Reserving stock', { id, quantity });

      const getResult = await this.getInventoryById(id);

      if (!getResult.success || !getResult.data) {
        return Err({
          message: 'Inventory item not found',
          code: 'INVENTORY_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const item = getResult.data;
      const newReserved = (item.reserved_quantity || 0) + quantity;

      if (newReserved > item.quantity) {
        return Err({
          message: 'Cannot reserve more than available quantity',
          code: 'INSUFFICIENT_STOCK',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const result = await this.dataStore
        .from('inventory')
        .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to reserve stock',
          code: 'RESERVE_STOCK_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.stock_reserved',
        payload: { inventoryId: id, quantity, newReserved },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception reserving stock', error);
      return Err({
        message: error.message || 'Unexpected error reserving stock',
        code: 'RESERVE_STOCK_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async releaseStock(id: string, quantity: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Releasing stock', { id, quantity });

      const getResult = await this.getInventoryById(id);

      if (!getResult.success || !getResult.data) {
        return Err({
          message: 'Inventory item not found',
          code: 'INVENTORY_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const item = getResult.data;
      const newReserved = Math.max(0, (item.reserved_quantity || 0) - quantity);

      const result = await this.dataStore
        .from('inventory')
        .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to release stock',
          code: 'RELEASE_STOCK_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.stock_released',
        payload: { inventoryId: id, quantity, newReserved },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception releasing stock', error);
      return Err({
        message: error.message || 'Unexpected error releasing stock',
        code: 'RELEASE_STOCK_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async setReorderLevel(id: string, level: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Setting reorder level', { id, level });

      const result = await this.dataStore
        .from('inventory')
        .update({ reorder_level: level, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to set reorder level',
          code: 'REORDER_LEVEL_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.reorder_level_set',
        payload: { inventoryId: id, level },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception setting reorder level', error);
      return Err({
        message: error.message || 'Unexpected error setting reorder level',
        code: 'REORDER_LEVEL_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getRestockRequests(filters?: {
    business_id?: string;
    product_id?: string;
    status?: string;
  }): AsyncResult<RestockRequest[], ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Fetching restock requests', { filters });

      let query = this.dataStore.from('restock_requests').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const result = await query.order('created_at', { ascending: false });

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fetch restock requests',
          code: 'RESTOCK_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      return Ok(result.data as RestockRequest[]);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception fetching restock requests', error);
      return Err({
        message: error.message || 'Unexpected error fetching restock requests',
        code: 'RESTOCK_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async createRestockRequest(
    request: Omit<RestockRequest, 'id' | 'created_at' | 'updated_at' | 'status'>
  ): AsyncResult<RestockRequest, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Creating restock request', { request });

      const result = await this.dataStore
        .from('restock_requests')
        .insert({ ...request, status: 'pending' })
        .select()
        .single();

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to create restock request',
          code: 'RESTOCK_CREATE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      const createdRequest = result.data as RestockRequest;

      DomainEvents.emit({
        type: 'inventory.restock_requested',
        payload: { requestId: createdRequest.id, productId: createdRequest.product_id },
        timestamp: Date.now(),
      });

      return Ok(createdRequest);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception creating restock request', error);
      return Err({
        message: error.message || 'Unexpected error creating restock request',
        code: 'RESTOCK_CREATE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async approveRestockRequest(id: string, approvedQuantity: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Approving restock request', { id, approvedQuantity });

      const result = await this.dataStore
        .from('restock_requests')
        .update({
          status: 'approved',
          approved_quantity: approvedQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending');

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to approve restock request',
          code: 'RESTOCK_APPROVE_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.restock_approved',
        payload: { requestId: id, approvedQuantity },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception approving restock request', error);
      return Err({
        message: error.message || 'Unexpected error approving restock request',
        code: 'RESTOCK_APPROVE_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async fulfillRestockRequest(id: string, fulfilledQuantity: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Fulfilling restock request', { id, fulfilledQuantity });

      const result = await this.dataStore
        .from('restock_requests')
        .update({
          status: 'fulfilled',
          fulfilled_quantity: fulfilledQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'approved');

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to fulfill restock request',
          code: 'RESTOCK_FULFILL_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.restock_fulfilled',
        payload: { requestId: id, fulfilledQuantity },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception fulfilling restock request', error);
      return Err({
        message: error.message || 'Unexpected error fulfilling restock request',
        code: 'RESTOCK_FULFILL_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async rejectRestockRequest(id: string, reason?: string): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryRepository] Rejecting restock request', { id, reason });

      const result = await this.dataStore
        .from('restock_requests')
        .update({
          status: 'rejected',
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending');

      if (!result.success) {
        return Err({
          message: result.error.message || 'Failed to reject restock request',
          code: 'RESTOCK_REJECT_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.restock_rejected',
        payload: { requestId: id, reason },
        timestamp: Date.now(),
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryRepository] Exception rejecting restock request', error);
      return Err({
        message: error.message || 'Unexpected error rejecting restock request',
        code: 'RESTOCK_REJECT_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
