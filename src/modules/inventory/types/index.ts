export type {
  InventoryItem,
  RestockRequest,
  StockAdjustment,
  InventoryBalance,
  InventoryItemEntity,
  RestockRequestEntity
} from '@domain/inventory/entities';

export interface InventoryFilters {
  status?: 'all' | 'low' | 'out' | 'in_stock';
  search?: string;
  productId?: string;
  locationId?: string;
  businessId?: string;
  category?: string;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  inStockCount: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderNeeded: number;
}

export interface AggregatedInventory {
  product_id: string;
  product_name: string;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  status: 'in_stock' | 'low' | 'out';
  reorderLevel?: number;
  items: InventoryItem[];
}

export interface DriverInventoryEntry {
  product_id: string;
  quantity: number;
  location_id?: string | null;
}

export interface StockAdjustmentOptions {
  inventoryId: string;
  quantityDelta: number;
  reason: string;
  adjustedBy: string;
  notes?: string;
}

export interface RestockRequestOptions {
  productId: string;
  businessId: string;
  requestedQuantity: number;
  requestedBy: string;
  notes?: string;
}

export interface ApproveRestockOptions {
  requestId: string;
  approvedQuantity: number;
  approvedBy: string;
  notes?: string;
}

export interface FulfillRestockOptions {
  requestId: string;
  fulfilledQuantity: number;
  fulfilledBy: string;
  notes?: string;
}

export interface InventorySortOptions {
  field: 'product' | 'quantity' | 'status' | 'lastRestocked';
  direction: 'asc' | 'desc';
}

export interface InventoryListOptions {
  filters?: InventoryFilters;
  sort?: InventorySortOptions;
  page?: number;
  limit?: number;
}
