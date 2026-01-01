import { Order, OrderStatus, CreateOrderData } from '../entities';

export interface OrderFilters {
  businessId?: string;
  status?: OrderStatus | OrderStatus[];
  driverId?: string;
  zoneId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  priority?: string;
  searchQuery?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderSortOptions {
  field: 'createdAt' | 'updatedAt' | 'total' | 'priority' | 'orderNumber';
  direction: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;

  findByOrderNumber(orderNumber: string): Promise<Order | null>;

  findMany(
    filters: OrderFilters,
    options?: {
      sort?: OrderSortOptions;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<Order>>;

  findByDriver(driverId: string, activeOnly?: boolean): Promise<Order[]>;

  findByCustomer(customerId: string): Promise<Order[]>;

  findByZone(zoneId: string, status?: OrderStatus): Promise<Order[]>;

  create(data: CreateOrderData): Promise<Order>;

  update(order: Order): Promise<Order>;

  delete(id: string): Promise<void>;

  count(filters?: OrderFilters): Promise<number>;

  getMetrics(businessId: string, dateRange?: { start: Date; end: Date }): Promise<OrderMetrics>;

  subscribe(
    filters: OrderFilters,
    callback: (event: OrderRealtimeEvent) => void
  ): () => void;
}

export interface OrderMetrics {
  totalOrders: number;
  pendingOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averageDeliveryTime: number;
  completionRate: number;
}

export interface OrderRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  order: Order;
  oldOrder?: Order;
}
