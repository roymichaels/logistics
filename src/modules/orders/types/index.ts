export type { Order, OrderStatus, OrderItem } from '@domain/orders/entities';

export interface OrderFilters {
  businessId?: string;
  status?: OrderStatus;
  customerId?: string;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface OrderStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
}
