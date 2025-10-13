import { Order, Product, User, Zone } from '../data/types';

export type OrderFilterStatus = Order['status'] | 'all';
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type OrderViewMode = 'list' | 'grid' | 'kanban';
export type DateRangeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export interface OrderFilters {
  status: OrderFilterStatus;
  dateRange: DateRangeFilter;
  customStartDate?: string;
  customEndDate?: string;
  zoneId?: string;
  driverId?: string;
  priority?: OrderPriority | 'all';
  searchQuery?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderMetrics {
  totalOrders: number;
  newOrders: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  avgOrderValue: number;
  completionRate: number;
  avgDeliveryTime?: number;
}

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  status: Order['status'];
  timestamp: string;
  performedBy?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface OrderAction {
  label: string;
  icon: string;
  action: () => void | Promise<void>;
  visible: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  loading?: boolean;
}

export interface EnhancedOrder extends Order {
  statusHistory?: OrderTimelineEvent[];
  estimatedPickupTime?: string;
  customerRatingCount?: number;
  isUrgent?: boolean;
  tags?: string[];
  internalNotes?: string[];
  assignmentScore?: number;
}

export interface OrderStatusConfig {
  status: Order['status'];
  label: string;
  icon: string;
  color: string;
  description: string;
  nextStatuses: Order['status'][];
  allowedRoles: User['role'][];
}

export interface CustomerOrderHistory {
  customerId: string;
  customerName: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  lastOrderDate?: string;
  favoriteProducts: Array<{ product: Product; orderCount: number }>;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  inventoryIssues: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

export interface BulkOrderOperation {
  action: 'assign' | 'cancel' | 'update_priority' | 'export';
  orderIds: string[];
  payload?: Record<string, any>;
}

export interface OrderSearchResult {
  order: EnhancedOrder;
  matchType: 'id' | 'customer' | 'phone' | 'address' | 'items';
  matchScore: number;
}
