export interface InventoryItem {
  id: string;
  product_id: string;
  business_id: string;
  quantity: number;
  reserved_quantity?: number;
  warehouse_location?: string;
  reorder_level?: number;
  last_restocked?: string;
  created_at: string;
  updated_at: string;
}

export interface RestockRequest {
  id: string;
  inventory_id: string;
  product_id: string;
  business_id: string;
  requested_quantity: number;
  requested_by: string;
  approved_quantity?: number;
  fulfilled_quantity?: number;
  status: 'pending' | 'approved' | 'fulfilled' | 'rejected';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StockAdjustment {
  id: string;
  inventory_id: string;
  quantity_delta: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
}

export interface InventoryBalance {
  product_id: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  locations: {
    location: string;
    quantity: number;
  }[];
}

export class InventoryItemEntity {
  constructor(private item: InventoryItem) {}

  get id(): string {
    return this.item.id;
  }

  get productId(): string {
    return this.item.product_id;
  }

  get businessId(): string {
    return this.item.business_id;
  }

  get quantity(): number {
    return this.item.quantity;
  }

  get availableQuantity(): number {
    return this.item.quantity - (this.item.reserved_quantity || 0);
  }

  get isLowStock(): boolean {
    if (!this.item.reorder_level) return false;
    return this.item.quantity <= this.item.reorder_level;
  }

  get isOutOfStock(): boolean {
    return this.item.quantity === 0;
  }

  canFulfill(requestedQuantity: number): boolean {
    return this.availableQuantity >= requestedQuantity;
  }

  toJSON(): InventoryItem {
    return { ...this.item };
  }
}

export class RestockRequestEntity {
  constructor(private request: RestockRequest) {}

  get id(): string {
    return this.request.id;
  }

  get status(): string {
    return this.request.status;
  }

  get isPending(): boolean {
    return this.request.status === 'pending';
  }

  get isApproved(): boolean {
    return this.request.status === 'approved';
  }

  get isFulfilled(): boolean {
    return this.request.status === 'fulfilled';
  }

  get isRejected(): boolean {
    return this.request.status === 'rejected';
  }

  canApprove(): boolean {
    return this.isPending;
  }

  canFulfill(): boolean {
    return this.isApproved;
  }

  toJSON(): RestockRequest {
    return { ...this.request };
  }
}
