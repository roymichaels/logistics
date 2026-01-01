export type {
  Order,
  OrderStatus,
  OrderItem,
  OrderPriority,
  OrderCustomer,
  OrderAddress,
  OrderPayment,
  OrderDelivery,
  OrderTimeline,
  PaymentMethod,
  PaymentStatus,
  CreateOrderData
} from '@domain/orders/entities';

export interface OrderFilters {
  businessId?: string;
  status?: OrderStatus;
  customerId?: string;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  priority?: OrderPriority;
  hasDriver?: boolean;
}

export interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  readyForPickup: number;
  assigned: number;
  pickedUp: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
  failed: number;
  totalRevenue: number;
  averageOrderValue: number;
  completionRate: number;
}

export interface OrderSortOptions {
  field: 'createdAt' | 'updatedAt' | 'total' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface OrderListOptions {
  filters?: OrderFilters;
  sort?: OrderSortOptions;
  page?: number;
  limit?: number;
}

export interface OrderActionOptions {
  orderId: string;
  performedBy: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface AssignDriverOptions extends OrderActionOptions {
  driverId: string;
  driverName: string;
  estimatedDeliveryTime?: Date;
}

export interface UpdateStatusOptions extends OrderActionOptions {
  newStatus: OrderStatus;
}

export interface CancelOrderOptions extends OrderActionOptions {
  reason: string;
  refundAmount?: number;
}

export interface CreateOrderOptions {
  businessId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  priority?: OrderPriority;
  discount?: number;
  deliveryFee?: number;
  notes?: string;
  tags?: string[];
  createdBy: string;
}
