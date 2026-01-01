import React, { useCallback, useEffect, useState } from 'react';
import { useAppServices } from '../../../context/AppServicesContext';
import { useDriverInventory } from '../hooks/useDriverInventory';
import { DriverInventoryView } from './DriverInventoryView';
import { Toast } from '../../../components/Toast';
import { logger } from '../../../lib/logger';
import { haptic } from '../../../utils/haptic';
import type { Product } from '../../../data/types';
import type { DriverInventoryEntry } from '../types';

interface EditableInventoryItem {
  product_id: string;
  quantity: number;
  draftQuantity: number;
  product?: Product;
  location_id?: string | null;
  isNew?: boolean;
}

export function DriverInventoryContainer() {
  const { dataStore } = useAppServices();
  const { syncInventory, syncing } = useDriverInventory();

  const [items, setItems] = useState<EditableInventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await dataStore.getProfile();
      const [inventoryRecords, productList] = await Promise.all([
        dataStore.listDriverInventory
          ? dataStore.listDriverInventory({ driver_id: profile.telegram_id })
          : Promise.resolve([]),
        dataStore.listProducts ? dataStore.listProducts() : Promise.resolve([])
      ]);

      const mappedItems: EditableInventoryItem[] = (inventoryRecords || []).map((record) => ({
        product_id: record.product_id,
        quantity: record.quantity,
        draftQuantity: record.quantity,
        product: record.product,
        location_id: record.location_id || undefined
      }));

      setItems(mappedItems);
      setProducts(productList || []);
    } catch (err) {
      logger.error('[DriverInventoryContainer] Failed to load driver inventory', err);
      Toast.error('שגיאה בטעינת מלאי');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [dataStore]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuantityChange = (productId: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, draftQuantity: Math.max(0, Math.round(value)) }
          : item
      )
    );
  };

  const handleRemove = (productId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, draftQuantity: 0 }
          : item
      )
    );
  };

  const handleAdd = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      Toast.error('מוצר לא נמצא');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        quantity: 0,
        draftQuantity: 1,
        product,
        isNew: true
      }
    ]);
  };

  const handleSync = async () => {
    const entries: DriverInventoryEntry[] = items.map((item) => ({
      product_id: item.product_id,
      quantity: item.draftQuantity,
      location_id: item.location_id
    }));

    const result = await syncInventory(entries, 'עדכון מלאי נהג');

    if (result.success) {
      Toast.success(`המלאי עודכן (${result.updated} עודכנו, ${result.removed} הוסרו)`);
      haptic('soft');
      await loadData();
    } else {
      Toast.error(result.error?.message || 'שגיאה בעדכון מלאי');
    }
  };

  return (
    <DriverInventoryView
      items={items}
      products={products}
      loading={loading}
      syncing={syncing}
      onQuantityChange={handleQuantityChange}
      onRemove={handleRemove}
      onAdd={handleAdd}
      onSync={handleSync}
    />
  );
}
