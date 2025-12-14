import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';
import { DomainEvents } from '@/domain/events/DomainEvents';

export interface RestockInput {
  inventory_id: string;
  quantity: number;
  notes?: string;
}

export interface AdjustStockInput {
  inventory_id: string;
  quantity_delta: number;
  reason: string;
}

export class InventoryCommands {
  constructor(private dataStore: IDataStore) {}

  async restock(input: RestockInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryCommands] Restocking inventory', { input });

      const getResult = await this.dataStore
        .from('inventory')
        .select('quantity')
        .eq('id', input.inventory_id)
        .single();

      if (!getResult.success) {
        return Err({
          message: 'Inventory item not found',
          code: 'INVENTORY_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const currentQuantity = getResult.data.quantity;
      const newQuantity = currentQuantity + input.quantity;

      const updateResult = await this.dataStore
        .from('inventory')
        .update({
          quantity: newQuantity,
          last_restocked: new Date().toISOString(),
        })
        .eq('id', input.inventory_id);

      if (!updateResult.success) {
        logger.error('[InventoryCommands] Failed to restock', updateResult.error);
        return Err({
          message: updateResult.error.message || 'Failed to restock inventory',
          code: 'RESTOCK_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: updateResult.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.restocked',
        payload: {
          inventoryId: input.inventory_id,
          quantity: input.quantity,
          newTotal: newQuantity,
        },
        timestamp: Date.now(),
      });

      logger.info('[InventoryCommands] Inventory restocked successfully', {
        inventoryId: input.inventory_id,
        newQuantity,
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryCommands] Exception restocking inventory', error);
      return Err({
        message: error.message || 'Unexpected error restocking inventory',
        code: 'RESTOCK_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async adjustStock(input: AdjustStockInput): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryCommands] Adjusting stock', { input });

      const getResult = await this.dataStore
        .from('inventory')
        .select('quantity')
        .eq('id', input.inventory_id)
        .single();

      if (!getResult.success) {
        return Err({
          message: 'Inventory item not found',
          code: 'INVENTORY_NOT_FOUND',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const currentQuantity = getResult.data.quantity;
      const newQuantity = currentQuantity + input.quantity_delta;

      if (newQuantity < 0) {
        return Err({
          message: 'Insufficient stock for adjustment',
          code: 'INSUFFICIENT_STOCK',
          severity: 'domain',
          timestamp: Date.now(),
        });
      }

      const updateResult = await this.dataStore
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', input.inventory_id);

      if (!updateResult.success) {
        logger.error('[InventoryCommands] Failed to adjust stock', updateResult.error);
        return Err({
          message: updateResult.error.message || 'Failed to adjust stock',
          code: 'STOCK_ADJUST_ERROR',
          severity: 'domain',
          timestamp: Date.now(),
          data: updateResult.error,
        });
      }

      DomainEvents.emit({
        type: 'inventory.adjusted',
        payload: {
          inventoryId: input.inventory_id,
          delta: input.quantity_delta,
          reason: input.reason,
          newTotal: newQuantity,
        },
        timestamp: Date.now(),
      });

      logger.info('[InventoryCommands] Stock adjusted successfully', {
        inventoryId: input.inventory_id,
        newQuantity,
      });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryCommands] Exception adjusting stock', error);
      return Err({
        message: error.message || 'Unexpected error adjusting stock',
        code: 'STOCK_ADJUST_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async setReorderLevel(inventoryId: string, reorderLevel: number): AsyncResult<void, ClassifiedError> {
    try {
      logger.info('[InventoryCommands] Setting reorder level', { inventoryId, reorderLevel });

      const result = await this.dataStore
        .from('inventory')
        .update({ reorder_level: reorderLevel })
        .eq('id', inventoryId);

      if (!result.success) {
        logger.error('[InventoryCommands] Failed to set reorder level', result.error);
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
        payload: { inventoryId, reorderLevel },
        timestamp: Date.now(),
      });

      logger.info('[InventoryCommands] Reorder level set successfully', { inventoryId });

      return Ok(undefined);
    } catch (error: any) {
      logger.error('[InventoryCommands] Exception setting reorder level', error);
      return Err({
        message: error.message || 'Unexpected error setting reorder level',
        code: 'REORDER_LEVEL_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
