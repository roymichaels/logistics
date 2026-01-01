import { useState, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { InventoryItem } from '@domain/inventory/entities';
import {
  StockAdjustmentOptions,
  RestockRequestOptions,
  ApproveRestockOptions,
  FulfillRestockOptions
} from '../types';
import { logger } from '@lib/logger';

export interface UseInventoryMutationsResult {
  adjusting: boolean;
  requesting: boolean;
  approving: boolean;
  fulfilling: boolean;
  error: string | null;

  adjustStock: (options: StockAdjustmentOptions) => Promise<boolean>;
  createRestockRequest: (options: RestockRequestOptions) => Promise<boolean>;
  approveRestock: (options: ApproveRestockOptions) => Promise<boolean>;
  fulfillRestock: (options: FulfillRestockOptions) => Promise<boolean>;
  updateInventory: (id: string, updates: Partial<InventoryItem>) => Promise<boolean>;
}

export function useInventoryMutations(): UseInventoryMutationsResult {
  const { dataStore } = useServices();

  const [adjusting, setAdjusting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjustStock = useCallback(async (options: StockAdjustmentOptions): Promise<boolean> => {
    if (!dataStore) {
      setError('Data store not available');
      return false;
    }

    setAdjusting(true);
    setError(null);

    try {
      const inventoryItem = await dataStore.getInventoryItem?.(options.inventoryId);

      if (!inventoryItem) {
        setError('Inventory item not found');
        return false;
      }

      const newQuantity = inventoryItem.quantity + options.quantityDelta;

      if (newQuantity < 0) {
        setError('Cannot adjust stock below zero');
        return false;
      }

      await dataStore.updateInventoryItem?.(options.inventoryId, {
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      });

      logger.info(`Stock adjusted for ${options.inventoryId}: ${options.quantityDelta}`, {
        inventoryId: options.inventoryId,
        delta: options.quantityDelta,
        reason: options.reason,
        adjustedBy: options.adjustedBy
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to adjust stock';
      logger.error('Stock adjustment failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setAdjusting(false);
    }
  }, [dataStore]);

  const createRestockRequest = useCallback(async (options: RestockRequestOptions): Promise<boolean> => {
    if (!dataStore?.createRestockRequest) {
      setError('Restock service not available');
      return false;
    }

    setRequesting(true);
    setError(null);

    try {
      await dataStore.createRestockRequest({
        product_id: options.productId,
        business_id: options.businessId,
        requested_quantity: options.requestedQuantity,
        requested_by: options.requestedBy,
        status: 'pending',
        notes: options.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);

      logger.info(`Restock request created for product ${options.productId}`, options);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create restock request';
      logger.error('Restock request creation failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setRequesting(false);
    }
  }, [dataStore]);

  const approveRestock = useCallback(async (options: ApproveRestockOptions): Promise<boolean> => {
    if (!dataStore?.updateRestockRequest) {
      setError('Restock service not available');
      return false;
    }

    setApproving(true);
    setError(null);

    try {
      await dataStore.updateRestockRequest(options.requestId, {
        status: 'approved',
        approved_quantity: options.approvedQuantity,
        approved_by: options.approvedBy,
        notes: options.notes,
        updated_at: new Date().toISOString()
      } as any);

      logger.info(`Restock request ${options.requestId} approved`, options);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve restock';
      logger.error('Restock approval failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setApproving(false);
    }
  }, [dataStore]);

  const fulfillRestock = useCallback(async (options: FulfillRestockOptions): Promise<boolean> => {
    if (!dataStore?.updateRestockRequest) {
      setError('Restock service not available');
      return false;
    }

    setFulfilling(true);
    setError(null);

    try {
      await dataStore.updateRestockRequest(options.requestId, {
        status: 'fulfilled',
        fulfilled_quantity: options.fulfilledQuantity,
        fulfilled_by: options.fulfilledBy,
        notes: options.notes,
        updated_at: new Date().toISOString()
      } as any);

      logger.info(`Restock request ${options.requestId} fulfilled`, options);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fulfill restock';
      logger.error('Restock fulfillment failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setFulfilling(false);
    }
  }, [dataStore]);

  const updateInventory = useCallback(async (id: string, updates: Partial<InventoryItem>): Promise<boolean> => {
    if (!dataStore?.updateInventoryItem) {
      setError('Inventory service not available');
      return false;
    }

    setAdjusting(true);
    setError(null);

    try {
      await dataStore.updateInventoryItem(id, updates);
      logger.info(`Inventory ${id} updated successfully`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update inventory';
      logger.error('Inventory update failed', err);
      setError(errorMessage);
      return false;
    } finally {
      setAdjusting(false);
    }
  }, [dataStore]);

  return {
    adjusting,
    requesting,
    approving,
    fulfilling,
    error,
    adjustStock,
    createRestockRequest,
    approveRestock,
    fulfillRestock,
    updateInventory
  };
}
