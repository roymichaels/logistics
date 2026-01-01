import { Order, OrderStatus } from '@domain/orders/entities';
import { logger } from '@lib/logger';

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StatusTransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  requiredFields?: string[];
  validators?: ((order: Order) => WorkflowValidationResult)[];
}

export class OrderWorkflowService {
  private readonly transitionRules: StatusTransitionRule[] = [
    {
      from: 'pending',
      to: 'confirmed',
      requiredFields: ['customer', 'items', 'payment'],
      validators: [this.validateItems, this.validateCustomer]
    },
    {
      from: 'confirmed',
      to: 'preparing',
      validators: [this.validatePayment]
    },
    {
      from: 'preparing',
      to: 'ready_for_pickup',
      validators: [this.validateItems]
    },
    {
      from: 'ready_for_pickup',
      to: 'assigned',
      requiredFields: ['delivery.driverId'],
      validators: [this.validateDriver]
    },
    {
      from: 'assigned',
      to: 'picked_up',
      validators: [this.validateDriver]
    },
    {
      from: 'picked_up',
      to: 'in_transit',
      validators: [this.validateDriver]
    },
    {
      from: 'in_transit',
      to: 'delivered',
      validators: [this.validateDelivery]
    }
  ];

  canTransition(order: Order, newStatus: OrderStatus): boolean {
    return order.canTransitionTo(newStatus);
  }

  validateTransition(order: Order, newStatus: OrderStatus): WorkflowValidationResult {
    const result: WorkflowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!this.canTransition(order, newStatus)) {
      result.valid = false;
      result.errors.push(`Cannot transition from ${order.status} to ${newStatus}`);
      return result;
    }

    const rule = this.transitionRules.find(
      r => r.from === order.status && r.to === newStatus
    );

    if (!rule) {
      return result;
    }

    if (rule.requiredFields) {
      for (const field of rule.requiredFields) {
        const value = this.getNestedValue(order, field);
        if (!value) {
          result.valid = false;
          result.errors.push(`Required field missing: ${field}`);
        }
      }
    }

    if (rule.validators) {
      for (const validator of rule.validators) {
        const validationResult = validator.call(this, order);
        if (!validationResult.valid) {
          result.valid = false;
          result.errors.push(...validationResult.errors);
        }
        result.warnings.push(...validationResult.warnings);
      }
    }

    return result;
  }

  getNextStatuses(order: Order): OrderStatus[] {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['assigned', 'cancelled'],
      assigned: ['picked_up', 'ready_for_pickup', 'cancelled'],
      picked_up: ['in_transit', 'assigned'],
      in_transit: ['delivered', 'failed'],
      delivered: [],
      cancelled: [],
      failed: ['pending']
    };

    return transitions[order.status] || [];
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready_for_pickup: 'Ready for Pickup',
      assigned: 'Assigned to Driver',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      failed: 'Failed'
    };

    return labels[status] || status;
  }

  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      pending: '#fbbf24',
      confirmed: '#60a5fa',
      preparing: '#a78bfa',
      ready_for_pickup: '#34d399',
      assigned: '#3b82f6',
      picked_up: '#8b5cf6',
      in_transit: '#06b6d4',
      delivered: '#10b981',
      cancelled: '#ef4444',
      failed: '#f87171'
    };

    return colors[status] || '#6b7280';
  }

  private validateItems(order: Order): WorkflowValidationResult {
    const result: WorkflowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!order.items || order.items.length === 0) {
      result.valid = false;
      result.errors.push('Order must have at least one item');
    }

    for (const item of order.items) {
      if (!item.productId || !item.productName) {
        result.valid = false;
        result.errors.push('All items must have product information');
      }

      if (item.quantity <= 0) {
        result.valid = false;
        result.errors.push(`Invalid quantity for item: ${item.productName}`);
      }

      if (item.unitPrice < 0) {
        result.valid = false;
        result.errors.push(`Invalid price for item: ${item.productName}`);
      }
    }

    return result;
  }

  private validateCustomer(order: Order): WorkflowValidationResult {
    const result: WorkflowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!order.customer) {
      result.valid = false;
      result.errors.push('Customer information is required');
      return result;
    }

    if (!order.customer.name) {
      result.valid = false;
      result.errors.push('Customer name is required');
    }

    if (!order.customer.phone) {
      result.valid = false;
      result.errors.push('Customer phone is required');
    }

    if (!order.customer.address) {
      result.valid = false;
      result.errors.push('Delivery address is required');
    }

    return result;
  }

  private validatePayment(order: Order): WorkflowValidationResult {
    const result: WorkflowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!order.payment) {
      result.valid = false;
      result.errors.push('Payment information is required');
      return result;
    }

    if (order.payment.status !== 'paid' && order.payment.method !== 'cash') {
      result.warnings.push('Payment is not yet confirmed');
    }

    return result;
  }

  private validateDriver(order: Order): WorkflowValidationResult {
    const result: WorkflowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!order.delivery?.driverId) {
      result.valid = false;
      result.errors.push('Driver must be assigned');
    }

    if (!order.delivery?.driverName) {
      result.warnings.push('Driver name is missing');
    }

    return result;
  }

  private validateDelivery(order: Order): WorkflowValidationResult {
    const result: WorkflowValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!order.delivery?.driverId) {
      result.valid = false;
      result.errors.push('Driver information is missing');
    }

    if (!order.delivery?.actualPickupTime) {
      result.warnings.push('Pickup time not recorded');
    }

    return result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  logTransition(order: Order, fromStatus: OrderStatus, toStatus: OrderStatus, performedBy: string): void {
    logger.info(`Order ${order.id} transitioned: ${fromStatus} -> ${toStatus}`, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      fromStatus,
      toStatus,
      performedBy,
      timestamp: new Date().toISOString()
    });
  }
}

export const orderWorkflowService = new OrderWorkflowService();
