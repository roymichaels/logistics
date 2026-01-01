export interface InventoryFilters {
  status?: 'all' | 'low' | 'out' | 'in_stock';
  search?: string;
  productId?: string;
  locationId?: string;
}

export interface InventoryStats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  inStockCount: number;
}

export interface AggregatedInventory {
  product_id: string;
  product_name: string;
  totalOnHand: number;
  totalReserved: number;
  status: 'in_stock' | 'low' | 'out';
  items: any[];
}

export interface DriverInventoryEntry {
  product_id: string;
  quantity: number;
  location_id?: string | null;
}

export interface StockAdjustment {
  inventory_id: string;
  quantity_change: number;
  reason: string;
}
