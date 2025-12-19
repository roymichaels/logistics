import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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

  // Memoize queries instance to prevent recreation
  const queries = useMemo(() => new InventoryQueries(app.db), [app.db]);

  // Stringify filters to create stable dependency
  const filtersKey = useMemo(() =>
    filters ? JSON.stringify(filters) : '',
    [filters?.business_id, filters?.product_id, filters?.low_stock]
  );

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);

    const parsedFilters = filtersKey ? JSON.parse(filtersKey) : undefined;
    const result = await queries.getInventory(parsedFilters);

    if (result.success) {
      setInventory(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [filtersKey, queries]);

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

  const queries = useMemo(() => new InventoryQueries(app.db), [app.db]);

  const fetchItem = useCallback(async () => {
    if (!inventoryId) return;

    setLoading(true);
    setError(null);

    const result = await queries.getInventoryById(inventoryId);

    if (result.success) {
      setItem(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [inventoryId, queries]);

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

  const queries = useMemo(() => new InventoryQueries(app.db), [app.db]);

  const fetchLowStockItems = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    setError(null);

    const result = await queries.getLowStockItems(businessId);

    if (result.success) {
      setItems(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [businessId, queries]);

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

  const commands = useMemo(() => new InventoryCommands(app.db), [app.db]);

  const restock = useCallback(async (input: RestockInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.restock(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, [commands]);

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

  const commands = useMemo(() => new InventoryCommands(app.db), [app.db]);

  const adjustStock = useCallback(async (input: AdjustStockInput): AsyncResult<void, ClassifiedError> => {
    setLoading(true);
    setError(null);

    const result = await commands.adjustStock(input);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  }, [commands]);

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

  const commands = useMemo(() => new InventoryCommands(app.db), [app.db]);

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
    [commands]
  );

  return {
    setReorderLevel,
    loading,
    error,
  };
};
