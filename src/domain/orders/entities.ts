export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type OrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'bank_transfer';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface OrderAddress {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

export interface OrderCustomer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  address: OrderAddress;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  tax?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionId?: string;
  paidAt?: Date;
}

export interface OrderDelivery {
  driverId?: string;
  driverName?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  zoneId?: string;
  zoneName?: string;
  proofOfDelivery?: {
    signature?: string;
    photoUrl?: string;
    notes?: string;
  };
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: Date;
  performedBy?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export class Order {
  readonly id: string;
  readonly businessId: string;
  readonly orderNumber: string;

  customer: OrderCustomer;
  items: OrderItem[];
  payment: OrderPayment;
  delivery: OrderDelivery;

  status: OrderStatus;
  priority: OrderPriority;
  timeline: OrderTimeline[];

  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;

  notes?: string;
  internalNotes?: string;
  tags?: string[];

  readonly createdAt: Date;
  readonly createdBy: string;
  updatedAt: Date;
  updatedBy?: string;

  constructor(data: OrderConstructorData) {
    this.id = data.id;
    this.businessId = data.businessId;
    this.orderNumber = data.orderNumber;
    this.customer = data.customer;
    this.items = data.items;
    this.payment = data.payment;
    this.delivery = data.delivery || {};
    this.status = data.status;
    this.priority = data.priority || 'normal';
    this.timeline = data.timeline || [];
    this.subtotal = data.subtotal;
    this.discount = data.discount || 0;
    this.tax = data.tax || 0;
    this.deliveryFee = data.deliveryFee || 0;
    this.total = data.total;
    this.notes = data.notes;
    this.internalNotes = data.internalNotes;
    this.tags = data.tags || [];
    this.createdAt = data.createdAt;
    this.createdBy = data.createdBy;
    this.updatedAt = data.updatedAt;
    this.updatedBy = data.updatedBy;
  }

  canTransitionTo(newStatus: OrderStatus): boolean {
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
      failed: ['pending'],
    };

    return transitions[this.status]?.includes(newStatus) || false;
  }

  updateStatus(newStatus: OrderStatus, performedBy: string, notes?: string): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status} to ${newStatus}`
      );
    }

    this.status = newStatus;
    this.timeline.push({
      status: newStatus,
      timestamp: new Date(),
      performedBy,
      notes,
    });
    this.updatedAt = new Date();
    this.updatedBy = performedBy;
  }

  assignDriver(driverId: string, driverName: string, performedBy: string): void {
    if (this.status !== 'ready_for_pickup') {
      throw new Error('Order must be ready for pickup before assigning a driver');
    }

    this.delivery.driverId = driverId;
    this.delivery.driverName = driverName;
    this.updateStatus('assigned', performedBy, `Assigned to driver: ${driverName}`);
  }

  calculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.total = this.subtotal - this.discount + this.tax + this.deliveryFee;
    this.payment.amount = this.total;
  }

  isDelivered(): boolean {
    return this.status === 'delivered';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  isActive(): boolean {
    return !this.isDelivered() && !this.isCancelled();
  }

  hasDriver(): boolean {
    return !!this.delivery.driverId;
  }

  getDurationInMinutes(): number | null {
    if (!this.isDelivered() || !this.delivery.actualDeliveryTime) {
      return null;
    }

    const diff = this.delivery.actualDeliveryTime.getTime() - this.createdAt.getTime();
    return Math.floor(diff / 60000);
  }
}

export interface OrderConstructorData {
  id: string;
  businessId: string;
  orderNumber: string;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: OrderPayment;
  delivery?: OrderDelivery;
  status: OrderStatus;
  priority?: OrderPriority;
  timeline?: OrderTimeline[];
  subtotal: number;
  discount?: number;
  tax?: number;
  deliveryFee?: number;
  total: number;
  notes?: string;
  internalNotes?: string;
  tags?: string[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface CreateOrderData {
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
