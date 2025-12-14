import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { IDataStore } from '@/foundation/abstractions/IDataStore';
import { Ok, Err } from '@/foundation/types/Result';
import { logger } from '@/lib/logger';

export interface InventoryItem {
  id: string;
  product_id: string;
  business_id: string;
  quantity: number;
  warehouse_location?: string;
  reorder_level?: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
}

export class InventoryQueries {
  constructor(private dataStore: IDataStore) {}

  async getInventory(filters?: {
    business_id?: string;
    product_id?: string;
    low_stock?: boolean;
  }): AsyncResult<InventoryItem[], ClassifiedError> {
    try {
      logger.info('[InventoryQueries] Fetching inventory', { filters });

      let query = this.dataStore.from('inventory').select('*');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }
      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      const result = await query.order('updated_at', { ascending: false });

      if (!result.success) {
        logger.error('[InventoryQueries] Failed to fetch inventory', result.error);
        return Err({
          message: result.error.message || 'Failed to fetch inventory',
          code: 'INVENTORY_QUERY_ERROR',
          severity: 'recoverable',
          timestamp: Date.now(),
          data: result.error,
        });
      }

      let items = result.data as InventoryItem[];

      if (filters?.low_stock) {
        items = items.filter(item =>
          item.reorder_level && item.quantity <= item.reorder_level
        );
      }

      return Ok(items);
    } catch (error: any) {
      logger.error('[InventoryQueries] Exception fetching inventory', error);
      return Err({
        message: error.message || 'Unexpected error fetching inventory',
        code: 'INVENTORY_QUERY_EXCEPTION',
        severity: 'fatal',
        timestamp: Date.now(),
        data: error,
      });
    }
  }

  async getInventoryById(inventoryId: string): AsyncResult<InventoryItem | null, ClassifiedError> {
    try {
      logger.info('[InventoryQueries] Fetching inventory item by ID', { inventoryId });

      const result = await this.dataStore
        .from('inventory')
        .select('*')
        .eq('id', inventoryId)
        .maybeSingle();

      if (!result.success) {
        logger.error('[InventoryQueries] Failed to fetch inventory item', result.error);
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
      logger.error('[InventoryQueries] Exception fetching inventory item', error);
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
      return this.getInventory({ business_id: businessId, low_stock: true });
    } catch (error: any) {
      return Err({
        message: error.message || 'Failed to fetch low stock items',
        code: 'LOW_STOCK_QUERY_EXCEPTION',
        severity: 'recoverable',
        timestamp: Date.now(),
        data: error,
      });
    }
  }
}
