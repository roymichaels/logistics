import {
  Order,
  OrderItem,
  CreateOrderData,
  OrderStatus,
  OrderPriority,
} from './entities';

export class OrderDomainService {
  static generateOrderNumber(businessId: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const businessPrefix = businessId.slice(0, 4).toUpperCase();
    return `${businessPrefix}-${timestamp}-${random}`;
  }

  static calculateItemSubtotal(item: OrderItem): number {
    const baseAmount = item.quantity * item.unitPrice;
    const discount = item.discount || 0;
    const tax = item.tax || 0;
    return baseAmount - discount + tax;
  }

  static calculateOrderTax(subtotal: number, taxRate: number): number {
    return Math.round(subtotal * taxRate * 100) / 100;
  }

  static calculateDeliveryFee(
    distance: number,
    baseRate: number,
    perKmRate: number
  ): number {
    return baseRate + distance * perKmRate;
  }

  static validateOrder(order: Order): OrderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!order.customer.name) {
      errors.push('Customer name is required');
    }

    if (!order.customer.phone) {
      errors.push('Customer phone is required');
    }

    if (!order.customer.address.street || !order.customer.address.city) {
      errors.push('Complete customer address is required');
    }

    if (order.items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    order.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Unit price cannot be negative`);
      }
    });

    if (order.total < 0) {
      errors.push('Order total cannot be negative');
    }

    if (order.discount > order.subtotal) {
      warnings.push('Discount exceeds subtotal');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static canUserModifyOrder(
    order: Order,
    userId: string,
    userRole: string
  ): boolean {
    if (order.isCancelled()) {
      return false;
    }

    const adminRoles = ['superadmin', 'admin', 'business_owner', 'manager'];
    if (adminRoles.includes(userRole)) {
      return true;
    }

    if (order.status === 'delivered') {
      return false;
    }

    if (userRole === 'dispatcher' && order.status !== 'delivered') {
      return true;
    }

    if (userRole === 'driver' && order.delivery.driverId === userId) {
      return ['assigned', 'picked_up', 'in_transit'].includes(order.status);
    }

    return false;
  }

  static getAvailableActionsForRole(
    order: Order,
    userRole: string
  ): OrderAction[] {
    const actions: OrderAction[] = [];

    if (order.isCancelled() || order.isDelivered()) {
      return actions;
    }

    const adminRoles = ['superadmin', 'admin', 'business_owner', 'manager'];
    const isAdmin = adminRoles.includes(userRole);

    if (isAdmin && order.canTransitionTo('cancelled')) {
      actions.push({
        type: 'cancel',
        label: 'Cancel Order',
        icon: 'x-circle',
      });
    }

    if (
      (isAdmin || userRole === 'dispatcher') &&
      order.status === 'ready_for_pickup'
    ) {
      actions.push({
        type: 'assign_driver',
        label: 'Assign Driver',
        icon: 'user-plus',
      });
    }

    if (userRole === 'driver' && order.delivery.driverId) {
      if (order.status === 'assigned') {
        actions.push({
          type: 'pickup',
          label: 'Mark as Picked Up',
          icon: 'package-check',
        });
      } else if (order.status === 'picked_up') {
        actions.push({
          type: 'start_delivery',
          label: 'Start Delivery',
          icon: 'truck',
        });
      } else if (order.status === 'in_transit') {
        actions.push({
          type: 'complete',
          label: 'Mark as Delivered',
          icon: 'check-circle',
        });
      }
    }

    if (isAdmin && order.status === 'pending') {
      actions.push({
        type: 'confirm',
        label: 'Confirm Order',
        icon: 'check',
      });
    }

    return actions;
  }

  static estimateDeliveryTime(
    distance: number,
    trafficFactor: number = 1.0
  ): number {
    const averageSpeed = 30;
    const preparationTime = 15;
    const baseDeliveryTime = (distance / averageSpeed) * 60;
    return Math.round(preparationTime + baseDeliveryTime * trafficFactor);
  }

  static isPriorityOrder(order: Order): boolean {
    return order.priority === 'high' || order.priority === 'urgent';
  }

  static getOrderAge(order: Order): number {
    return Math.floor((Date.now() - order.createdAt.getTime()) / 60000);
  }

  static shouldEscalate(order: Order): boolean {
    const ageInMinutes = this.getOrderAge(order);

    if (order.priority === 'urgent' && ageInMinutes > 15) {
      return true;
    }

    if (order.priority === 'high' && ageInMinutes > 30) {
      return true;
    }

    if (order.status === 'pending' && ageInMinutes > 60) {
      return true;
    }

    return false;
  }
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OrderAction {
  type: string;
  label: string;
  icon: string;
}
