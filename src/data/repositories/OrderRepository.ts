import {
  IOrderRepository,
  OrderFilters,
  OrderSortOptions,
  PaginatedResult,
  OrderMetrics,
  OrderRealtimeEvent,
} from '../../domain/orders/repositories/IOrderRepository';
import {
  Order,
  OrderStatus,
  CreateOrderData,
  OrderConstructorData,
  OrderItem,
  OrderCustomer,
  OrderPayment,
  OrderDelivery,
  OrderTimeline,
} from '../../domain/orders/entities';
import { OrderDomainService } from '../../domain/orders/services';
import { FrontendDataStore } from '../../lib/frontendDataStore';
import { logger } from '../../lib/logger';

export class OrderRepository implements IOrderRepository {
  constructor(private dataStore: FrontendDataStore) {}

  async findById(id: string): Promise<Order | null> {
    try {
      const result = await this.dataStore.getOrders({ id });
      if (!result || result.length === 0) {
        return null;
      }
      return this.mapToOrder(result[0]);
    } catch (error) {
      logger.error('OrderRepository.findById failed:', error);
      throw new Error('Failed to fetch order');
    }
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    try {
      const result = await this.dataStore.getOrders({});
      const order = result.find((o: any) => o.order_number === orderNumber);
      return order ? this.mapToOrder(order) : null;
    } catch (error) {
      logger.error('OrderRepository.findByOrderNumber failed:', error);
      throw new Error('Failed to fetch order by order number');
    }
  }

  async findMany(
    filters: OrderFilters,
    options?: {
      sort?: OrderSortOptions;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<Order>> {
    try {
      const dbFilters: any = {};

      if (filters.businessId) {
        dbFilters.business_id = filters.businessId;
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          dbFilters.status = filters.status;
        } else {
          dbFilters.status = filters.status;
        }
      }

      if (filters.driverId) {
        dbFilters.assigned_driver = filters.driverId;
      }

      if (filters.customerId) {
        dbFilters.customer_id = filters.customerId;
      }

      const allOrders = await this.dataStore.getOrders(dbFilters);
      let filteredOrders = allOrders.map((o: any) => this.mapToOrder(o));

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredOrders = filteredOrders.filter(
          (order: Order) =>
            order.orderNumber.toLowerCase().includes(query) ||
            order.customer.name.toLowerCase().includes(query) ||
            order.customer.phone.includes(query)
        );
      }

      if (filters.minAmount !== undefined) {
        filteredOrders = filteredOrders.filter((order: Order) => order.total >= filters.minAmount!);
      }

      if (filters.maxAmount !== undefined) {
        filteredOrders = filteredOrders.filter((order: Order) => order.total <= filters.maxAmount!);
      }

      if (options?.sort) {
        filteredOrders.sort((a: Order, b: Order) => {
          const { field, direction } = options.sort!;
          let aVal: any = a[field as keyof Order];
          let bVal: any = b[field as keyof Order];

          if (aVal instanceof Date) aVal = aVal.getTime();
          if (bVal instanceof Date) bVal = bVal.getTime();

          if (direction === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
      }

      const page = options?.page || 1;
      const pageSize = options?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedData = filteredOrders.slice(start, end);

      return {
        data: paginatedData,
        total: filteredOrders.length,
        page,
        pageSize,
        hasMore: end < filteredOrders.length,
      };
    } catch (error) {
      logger.error('OrderRepository.findMany failed:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  async findByDriver(driverId: string, activeOnly = false): Promise<Order[]> {
    try {
      const allOrders = await this.dataStore.getOrders({});
      const orders = allOrders.filter((o: any) => {
        const matchesDriver = o.metadata?.assigned_driver === driverId;
        if (!activeOnly) return matchesDriver;
        return matchesDriver && ['assigned', 'picked_up', 'in_transit'].includes(o.status);
      });
      return orders.map((o: any) => this.mapToOrder(o));
    } catch (error) {
      logger.error('OrderRepository.findByDriver failed:', error);
      throw new Error('Failed to fetch driver orders');
    }
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    try {
      const result = await this.dataStore.getOrders({ customer_id: customerId });
      return result.map((o: any) => this.mapToOrder(o));
    } catch (error) {
      logger.error('OrderRepository.findByCustomer failed:', error);
      throw new Error('Failed to fetch customer orders');
    }
  }

  async findByZone(zoneId: string, status?: OrderStatus): Promise<Order[]> {
    try {
      const result = await this.dataStore.getOrders({});
      const filtered = result.filter((o: any) => {
        const matchesZone = o.delivery_zone_id === zoneId;
        if (!status) return matchesZone;
        return matchesZone && o.status === status;
      });
      return filtered.map((o: any) => this.mapToOrder(o));
    } catch (error) {
      logger.error('OrderRepository.findByZone failed:', error);
      throw new Error('Failed to fetch zone orders');
    }
  }

  async create(data: CreateOrderData): Promise<Order> {
    try {
      const orderNumber = OrderDomainService.generateOrderNumber(data.businessId);

      const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
      const discount = data.discount || 0;
      const deliveryFee = data.deliveryFee || 0;
      const tax = OrderDomainService.calculateOrderTax(subtotal, 0.1);
      const total = subtotal - discount + tax + deliveryFee;

      const orderData = {
        business_id: data.businessId,
        order_number: orderNumber,
        customer_id: data.customer.id,
        delivery_address: data.customer.address,
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        status: 'pending' as OrderStatus,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        delivery_fee: deliveryFee,
        total: total,
        currency: 'USD',
        notes: data.notes,
        metadata: {
          priority: data.priority || 'normal',
          tags: data.tags,
        },
      };

      const created = await this.dataStore.createOrder(orderData as any);
      return this.mapToOrder(created);
    } catch (error) {
      logger.error('OrderRepository.create failed:', error);
      throw new Error('Failed to create order');
    }
  }

  async update(order: Order): Promise<Order> {
    try {
      const updateData = {
        status: order.status,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        delivery_fee: order.deliveryFee,
        total: order.total,
        notes: order.notes,
        payment_status: order.payment.status,
        delivery_zone_id: order.delivery.zoneId,
        metadata: {
          priority: order.priority,
          assigned_driver: order.delivery.driverId,
          driver_name: order.delivery.driverName,
          zone_name: order.delivery.zoneName,
          internal_notes: order.internalNotes,
          tags: order.tags,
        },
        updated_at: new Date().toISOString(),
      };

      const updated = await this.dataStore.updateOrder(order.id, updateData as any);
      return this.mapToOrder(updated);
    } catch (error) {
      logger.error('OrderRepository.update failed:', error);
      throw new Error('Failed to update order');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.dataStore.deleteOrder(id);
    } catch (error) {
      logger.error('OrderRepository.delete failed:', error);
      throw new Error('Failed to delete order');
    }
  }

  async count(filters?: OrderFilters): Promise<number> {
    try {
      const dbFilters = filters ? this.mapFiltersToDb(filters) : {};
      const result = await this.dataStore.getOrders(dbFilters);
      return result.length;
    } catch (error) {
      logger.error('OrderRepository.count failed:', error);
      return 0;
    }
  }

  async getMetrics(
    businessId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<OrderMetrics> {
    try {
      const filters: any = { business_id: businessId };
      const orders = await this.dataStore.getOrders(filters);

      let filteredOrders = orders;
      if (dateRange) {
        filteredOrders = orders.filter((o: any) => {
          const createdAt = new Date(o.created_at);
          return createdAt >= dateRange.start && createdAt <= dateRange.end;
        });
      }

      const totalOrders = filteredOrders.length;
      const pendingOrders = filteredOrders.filter((o: any) => o.status === 'pending').length;
      const activeOrders = filteredOrders.filter((o: any) =>
        ['confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit'].includes(o.status)
      ).length;
      const completedOrders = filteredOrders.filter((o: any) => o.status === 'delivered').length;
      const cancelledOrders = filteredOrders.filter((o: any) => o.status === 'cancelled').length;

      const totalRevenue = filteredOrders
        .filter((o: any) => o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

      const averageOrderValue = totalOrders > 0 ? totalRevenue / completedOrders || 0 : 0;

      const deliveredOrdersWithTime = filteredOrders.filter(
        (o: any) => o.status === 'delivered' && o.delivered_at
      );

      let averageDeliveryTime = 0;
      if (deliveredOrdersWithTime.length > 0) {
        const totalTime = deliveredOrdersWithTime.reduce((sum: number, o: any) => {
          const created = new Date(o.created_at).getTime();
          const delivered = new Date(o.delivered_at).getTime();
          return sum + (delivered - created);
        }, 0);
        averageDeliveryTime = totalTime / deliveredOrdersWithTime.length / 60000;
      }

      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      return {
        totalOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
        averageDeliveryTime,
        completionRate,
      };
    } catch (error) {
      logger.error('OrderRepository.getMetrics failed:', error);
      throw new Error('Failed to fetch order metrics');
    }
  }

  subscribe(
    filters: OrderFilters,
    callback: (event: OrderRealtimeEvent) => void
  ): () => void {
    return () => {};
  }

  private mapToOrder(data: any): Order {
    const deliveryAddress = data.delivery_address || {};

    const orderData: OrderConstructorData = {
      id: data.id,
      businessId: data.business_id,
      orderNumber: data.order_number || data.id,
      customer: {
        id: data.customer_id,
        name: deliveryAddress.name || '',
        phone: deliveryAddress.phone || '',
        email: deliveryAddress.email || '',
        address: deliveryAddress || {},
      },
      items: data.items || [],
      payment: {
        method: data.payment_method || 'cash',
        status: data.payment_status || 'pending',
        amount: data.total || 0,
      },
      delivery: {
        driverId: data.metadata?.assigned_driver,
        driverName: data.metadata?.driver_name,
        zoneId: data.delivery_zone_id,
        zoneName: data.metadata?.zone_name,
      },
      status: data.status,
      priority: data.metadata?.priority || 'normal',
      timeline: [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      deliveryFee: data.delivery_fee || 0,
      total: data.total || 0,
      notes: data.notes,
      internalNotes: data.metadata?.internal_notes,
      tags: data.metadata?.tags || [],
      createdAt: new Date(data.created_at),
      createdBy: undefined,
      updatedAt: new Date(data.updated_at),
      updatedBy: undefined,
    };

    return new Order(orderData);
  }

  private mapFiltersToDb(filters: OrderFilters): any {
    const dbFilters: any = {};

    if (filters.businessId) dbFilters.business_id = filters.businessId;
    if (filters.status) dbFilters.status = filters.status;
    if (filters.customerId) dbFilters.customer_id = filters.customerId;

    return dbFilters;
  }
}
