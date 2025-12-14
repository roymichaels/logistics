import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../services/useApp';
import { InventoryQueries, InventoryCommands } from '../';
import type { InventoryItem } from '../queries/inventory.queries';
import type { RestockInput, AdjustStockInput } from '../commands/inventory.commands';
import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';

export const useInventory = (filters?: {
  business_id?: string;
  product_id?: string;
  low_stock?: boolean;
}) => {
  const app = useApp();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new InventoryQueries(app.db);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getInventory(filters);

    if (result.success) {
      setInventory(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return {
    inventory,
    loading,
    error,
    refetch: fetchInventory,
  };
};

export const useInventoryItem = (inventoryId: string) => {
  const app = useApp();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new InventoryQueries(app.db);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getInventoryById(inventoryId);

    if (result.success) {
      setItem(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [inventoryId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  return {
    item,
    loading,
    error,
    refetch: fetchItem,
  };
};

export const useLowStockItems = (businessId: string) => {
  const app = useApp();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const queries = new InventoryQueries(app.db);

  const fetchLowStockItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await queries.getLowStockItems(businessId);

    if (result.success) {
      setItems(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchLowStockItems();
  }, [fetchLowStockItems]);

  return {
    items,
    loading,
    error,
    refetch: fetchLowStockItems,
  };
};

export const useRestock = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new InventoryCommands(app.db);

  const restock = useCallback(async (input: RestockInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.restock(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    restock,
    loading,
    error,
  };
};

export const useAdjustStock = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new InventoryCommands(app.db);

  const adjustStock = useCallback(async (input: AdjustStockInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.adjustStock(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, []);

  return {
    adjustStock,
    loading,
    error,
  };
};

export const useSetReorderLevel = () => {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);

  const commands = new InventoryCommands(app.db);

  const setReorderLevel = useCallback(
    async (inventoryId: string, reorderLevel: number): AsyncResult<void, ClassifiedError> => {
      setLoading(true);
      setError(null);

      const result = await commands.setReorderLevel(inventoryId, reorderLevel);

      if (!result.success) {
        setError(result.error);
      }

      setLoading(false);
      return result;
    },
    []
  );

  return {
    setReorderLevel,
    loading,
    error,
  };
};
