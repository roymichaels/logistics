import { useState, useEffect, useCallback } from 'react';
import { useServices } from '@foundation/container/ServiceProvider';
import { InventoryItem } from '@domain/inventory/entities';
import { logger } from '@lib/logger';

export interface UseInventoryOptions {
  businessId?: string;
  category?: string;
  lowStockOnly?: boolean;
  autoLoad?: boolean;
}

export interface UseInventoryResult {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createItem: (data: Partial<InventoryItem>) => Promise<InventoryItem | null>;
  updateItem: (id: string, data: Partial<InventoryItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  adjustStock: (id: string, quantity: number, reason?: string) => Promise<boolean>;
  getItem: (id: string) => Promise<InventoryItem | null>;
}

export function useInventory(options: UseInventoryOptions = {}): UseInventoryResult {
  const { businessId, category, lowStockOnly, autoLoad = true } = options;
  const { dataStore } = useServices();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    if (!dataStore?.listInventory) {
      setError('Inventory service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: any = {};
      if (businessId) filters.businessId = businessId;
      if (category) filters.category = category;

      let result = await dataStore.listInventory(filters);

      if (lowStockOnly && result) {
        result = result.filter(item =>
          item.quantity <= (item.lowStockThreshold || 10)
        );
      }

      setItems(result || []);
    } catch (err) {
      logger.error('Failed to load inventory', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [dataStore, businessId, category, lowStockOnly]);

  const createItem = useCallback(async (data: Partial<InventoryItem>) => {
    if (!dataStore?.createInventoryItem) {
      setError('Create item service not available');
      return null;
    }

    try {
      const newItem = await dataStore.createInventoryItem(data as any);
      if (newItem) {
        setItems(prev => [...prev, newItem]);
      }
      return newItem;
    } catch (err) {
      logger.error('Failed to create inventory item', err);
      setError(err instanceof Error ? err.message : 'Failed to create item');
      return null;
    }
  }, [dataStore]);

  const updateItem = useCallback(async (id: string, data: Partial<InventoryItem>) => {
    if (!dataStore?.updateInventoryItem) {
      setError('Update item service not available');
      return false;
    }

    try {
      await dataStore.updateInventoryItem(id, data);
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, ...data } : item
      ));
      return true;
    } catch (err) {
      logger.error('Failed to update inventory item', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
      return false;
    }
  }, [dataStore]);

  const deleteItem = useCallback(async (id: string) => {
    if (!dataStore?.deleteInventoryItem) {
      setError('Delete item service not available');
      return false;
    }

    try {
      await dataStore.deleteInventoryItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    } catch (err) {
      logger.error('Failed to delete inventory item', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      return false;
    }
  }, [dataStore]);

  const adjustStock = useCallback(async (id: string, quantity: number, reason?: string) => {
    if (!dataStore?.adjustInventoryStock) {
      setError('Stock adjustment service not available');
      return false;
    }

    try {
      await dataStore.adjustInventoryStock(id, quantity, reason);
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + quantity } : item
      ));
      return true;
    } catch (err) {
      logger.error('Failed to adjust stock', err);
      setError(err instanceof Error ? err.message : 'Failed to adjust stock');
      return false;
    }
  }, [dataStore]);

  const getItem = useCallback(async (id: string) => {
    if (!dataStore?.getInventoryItem) {
      setError('Get item service not available');
      return null;
    }

    try {
      return await dataStore.getInventoryItem(id);
    } catch (err) {
      logger.error('Failed to get inventory item', err);
      setError(err instanceof Error ? err.message : 'Failed to get item');
      return null;
    }
  }, [dataStore]);

  useEffect(() => {
    if (autoLoad) {
      loadInventory();
    }
  }, [autoLoad, loadInventory]);

  return {
    items,
    loading,
    error,
    refresh: loadInventory,
    createItem,
    updateItem,
    deleteItem,
    adjustStock,
    getItem,
  };
}
