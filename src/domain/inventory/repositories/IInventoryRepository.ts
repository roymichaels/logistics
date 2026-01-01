import type { AsyncResult } from '@/foundation/types/Result';
import type { ClassifiedError } from '@/foundation/error/ErrorTypes';
import type { InventoryItem, RestockRequest, StockAdjustment } from '../entities';

export interface IInventoryRepository {
  getInventory(filters?: {
    business_id?: string;
    product_id?: string;
    location?: string;
  }): AsyncResult<InventoryItem[], ClassifiedError>;

  getInventoryById(id: string): AsyncResult<InventoryItem | null, ClassifiedError>;

  getLowStockItems(businessId: string): AsyncResult<InventoryItem[], ClassifiedError>;

  getOutOfStockItems(businessId: string): AsyncResult<InventoryItem[], ClassifiedError>;

  createInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): AsyncResult<InventoryItem, ClassifiedError>;

  updateQuantity(id: string, quantity: number): AsyncResult<void, ClassifiedError>;

  adjustStock(adjustment: Omit<StockAdjustment, 'id' | 'created_at'>): AsyncResult<void, ClassifiedError>;

  reserveStock(id: string, quantity: number): AsyncResult<void, ClassifiedError>;

  releaseStock(id: string, quantity: number): AsyncResult<void, ClassifiedError>;

  setReorderLevel(id: string, level: number): AsyncResult<void, ClassifiedError>;

  getRestockRequests(filters?: {
    business_id?: string;
    product_id?: string;
    status?: string;
  }): AsyncResult<RestockRequest[], ClassifiedError>;

  createRestockRequest(request: Omit<RestockRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): AsyncResult<RestockRequest, ClassifiedError>;

  approveRestockRequest(id: string, approvedQuantity: number): AsyncResult<void, ClassifiedError>;

  fulfillRestockRequest(id: string, fulfilledQuantity: number): AsyncResult<void, ClassifiedError>;

  rejectRestockRequest(id: string, reason?: string): AsyncResult<void, ClassifiedError>;
}
