import React, { useEffect, useMemo } from 'react';
import { useInventory, useLowStockItems, useAdjustStock } from '../../../application/use-cases';
import { useCatalog } from '../../../application/use-cases';
import { useApp } from '../../../application/services/useApp';
import { useAppServices } from '../../../context/AppServicesContext';
import { useInventoryFilters } from '../hooks/useInventoryFilters';
import { useInventoryStats } from '../hooks/useInventoryStats';
import { InventoryView } from './InventoryView';
import { Toast } from '../../../components/Toast';
import { logger } from '../../../lib/logger';
import type { AggregatedInventory, StockAdjustment } from '../types';
import type { InventoryItem } from '../../../application/queries/inventory.queries';

interface InventoryContainerProps {
  businessId?: string;
}

export function InventoryContainer({ businessId }: InventoryContainerProps) {
  const app = useApp();
  const { currentBusinessId } = useAppServices();
  const effectiveBusinessId = businessId || currentBusinessId;

  const { products, loading: productsLoading, refetch: refetchProducts } = useCatalog({
    business_id: effectiveBusinessId || undefined
  });
  const { inventory, loading: inventoryLoading, error, refetch } = useInventory({
    business_id: effectiveBusinessId || undefined
  });
  const { items: lowStockItems } = useLowStockItems(effectiveBusinessId || '');
  const { adjustStock, loading: adjusting } = useAdjustStock();

  const loading = productsLoading || inventoryLoading;

  useEffect(() => {
    logger.debug('[InventoryContainer] Component mounted, subscribing to events');

    const unsubInventory = app.events?.on('StockLow', () => {
      logger.debug('[InventoryContainer] StockLow event received, refetching');
      refetch();
    });

    const unsubProductUpdated = app.events?.on('ProductUpdated', () => {
      logger.debug('[InventoryContainer] ProductUpdated event received, refetching');
      refetch();
    });

    return () => {
      unsubInventory?.();
      unsubProductUpdated?.();
    };
  }, [app.events, refetch]);

  useEffect(() => {
    logger.info('[InventoryContainer] Business context changed, refetching...', { effectiveBusinessId });
    refetch();
    refetchProducts();
  }, [effectiveBusinessId, refetch, refetchProducts]);

  const aggregatedInventory = useMemo(() => {
    if (!products || !inventory) return [];

    const productMap = new Map(products.map(p => [p.id, p]));
    const inventoryByProduct = new Map<string, InventoryItem[]>();

    inventory.forEach(item => {
      const existing = inventoryByProduct.get(item.product_id) || [];
      existing.push(item);
      inventoryByProduct.set(item.product_id, existing);
    });

    const aggregated: AggregatedInventory[] = [];

    inventoryByProduct.forEach((items, productId) => {
      const product = productMap.get(productId);
      if (!product) return;

      const totalOnHand = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalReserved = items.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0);

      const hasLowStock = items.some(item =>
        item.quantity <= (item.reorder_level || 0)
      );

      const status = totalOnHand === 0 ? 'out' : hasLowStock ? 'low' : 'in_stock';

      aggregated.push({
        product_id: productId,
        product_name: product.name,
        totalOnHand,
        totalReserved,
        status,
        items,
      });
    });

    return aggregated;
  }, [products, inventory]);

  const { filters, setFilters, filteredInventory } = useInventoryFilters(aggregatedInventory);
  const stats = useInventoryStats(filteredInventory);

  const handleAdjustStock = async (adjustment: StockAdjustment) => {
    logger.debug('[InventoryContainer] Adjusting inventory', adjustment);

    const result = await adjustStock({
      inventory_id: adjustment.inventory_id,
      quantity_change: adjustment.quantity_change,
      reason: adjustment.reason,
    });

    if (result.success) {
      Toast.success('המלאי עודכן בהצלחה');
      logger.debug('[InventoryContainer] Inventory adjusted successfully');
      refetch();
    } else {
      Toast.error(result.error.message || 'שגיאה בעדכון מלאי');
      logger.error('[InventoryContainer] Failed to adjust inventory', result.error);
      throw result.error;
    }
  };

  return (
    <InventoryView
      inventory={filteredInventory}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      lowStockCount={lowStockItems?.length || 0}
      onFilterChange={setFilters}
      onAdjustStock={handleAdjustStock}
      onRefresh={refetch}
      adjusting={adjusting}
    />
  );
}
