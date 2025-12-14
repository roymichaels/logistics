export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId?: string;
  businessId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel?: number;
  reorderQuantity?: number;
  lastRestocked?: number;
  updatedAt: number;
}

export interface Warehouse {
  id: string;
  infrastructureId: string;
  name: string;
  location: string;
  capacity?: number;
  managerId?: string;
  status: 'active' | 'inactive';
  createdAt: number;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  reason?: string;
  performedBy: string;
  createdAt: number;
}
