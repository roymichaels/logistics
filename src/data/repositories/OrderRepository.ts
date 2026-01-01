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
      const filters: any = { assigned_driver: driverId };
      if (activeOnly) {
        filters.status = ['assigned', 'picked_up', 'in_transit'];
      }

      const result = await this.dataStore.getOrders(filters);
      return result.map((o: any) => this.mapToOrder(o));
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
      const filters: any = { zone_id: zoneId };
      if (status) {
        filters.status = status;
      }

      const result = await this.dataStore.getOrders(filters);
      return result.map((o: any) => this.mapToOrder(o));
    } catch (error) {
      logger.error('OrderRepository.findByZone failed:', error);
      throw new Error('Failed to fetch zone orders');
    }
  }

  async create(data: CreateOrderData): Promise<Order> {
    try {
      const orderNumber = OrderDomainService.generateOrderNumber(data.businessId);

      const orderData = {
        business_id: data.businessId,
        order_number: orderNumber,
        customer_name: data.customer.name,
        customer_phone: data.customer.phone,
        customer_email: data.customer.email,
        customer_address: JSON.stringify(data.customer.address),
        items: data.items,
        payment_method: data.paymentMethod,
        payment_status: 'pending',
        status: 'pending' as OrderStatus,
        priority: data.priority || 'normal',
        subtotal: data.items.reduce((sum, item) => sum + item.subtotal, 0),
        discount: data.discount || 0,
        tax: 0,
        delivery_fee: data.deliveryFee || 0,
        notes: data.notes,
        tags: data.tags,
        created_by: data.createdBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      orderData.tax = OrderDomainService.calculateOrderTax(orderData.subtotal, 0.1);
      orderData.total = orderData.subtotal - orderData.discount + orderData.tax + orderData.delivery_fee;

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
        priority: order.priority,
        assigned_driver: order.delivery.driverId,
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        delivery_fee: order.deliveryFee,
        total: order.total,
        notes: order.notes,
        internal_notes: order.internalNotes,
        tags: order.tags,
        updated_at: new Date().toISOString(),
        updated_by: order.updatedBy,
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
        ['confirmed', 'preparing', 'ready_for_pickup', 'assigned', 'picked_up', 'in_transit'].includes(o.status)
      ).length;
      const completedOrders = filteredOrders.filter((o: any) => o.status === 'delivered').length;
      const cancelledOrders = filteredOrders.filter((o: any) => o.status === 'cancelled').length;

      const totalRevenue = filteredOrders
        .filter((o: any) => o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

      const averageOrderValue = totalOrders > 0 ? totalRevenue / completedOrders || 0 : 0;

      const deliveredOrdersWithTime = filteredOrders.filter(
        (o: any) => o.status === 'delivered' && o.delivery_completed_at
      );

      let averageDeliveryTime = 0;
      if (deliveredOrdersWithTime.length > 0) {
        const totalTime = deliveredOrdersWithTime.reduce((sum: number, o: any) => {
          const created = new Date(o.created_at).getTime();
          const delivered = new Date(o.delivery_completed_at).getTime();
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
    const orderData: OrderConstructorData = {
      id: data.id,
      businessId: data.business_id,
      orderNumber: data.order_number || data.id,
      customer: {
        id: data.customer_id,
        name: data.customer_name,
        phone: data.customer_phone,
        email: data.customer_email,
        address:
          typeof data.customer_address === 'string'
            ? JSON.parse(data.customer_address)
            : data.customer_address || {},
      },
      items: data.items || [],
      payment: {
        method: data.payment_method || 'cash',
        status: data.payment_status || 'pending',
        amount: data.total || 0,
      },
      delivery: {
        driverId: data.assigned_driver,
        driverName: data.driver_name,
        zoneId: data.zone_id,
        zoneName: data.zone_name,
      },
      status: data.status,
      priority: data.priority || 'normal',
      timeline: data.timeline || [],
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      tax: data.tax || 0,
      deliveryFee: data.delivery_fee || 0,
      total: data.total || 0,
      notes: data.notes,
      internalNotes: data.internal_notes,
      tags: data.tags || [],
      createdAt: new Date(data.created_at),
      createdBy: data.created_by,
      updatedAt: new Date(data.updated_at),
      updatedBy: data.updated_by,
    };

    return new Order(orderData);
  }

  private mapFiltersToDb(filters: OrderFilters): any {
    const dbFilters: any = {};

    if (filters.businessId) dbFilters.business_id = filters.businessId;
    if (filters.status) dbFilters.status = filters.status;
    if (filters.driverId) dbFilters.assigned_driver = filters.driverId;
    if (filters.customerId) dbFilters.customer_id = filters.customerId;
    if (filters.zoneId) dbFilters.zone_id = filters.zoneId;

    return dbFilters;
  }
}
