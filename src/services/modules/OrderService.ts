/**
 * Order Service
 *
 * Handles all order-related operations:
 * - Order management (CRUD)
 * - Order filtering and searching
 * - Order status updates
 */

import { BaseService } from '../base/BaseService';
import { Order, CreateOrderInput } from '../../data/types';
import { logger } from '../../lib/logger';

export class OrderService extends BaseService {
  async listOrders(filters?: {
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
    assignedDriver?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Order[]> {
    let query = this.supabase.from('orders').select('*');

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.q) {
      query = query.or(
        `customer_name.ilike.%${filters.q}%,customer_phone.ilike.%${filters.q}%,customer_address.ilike.%${filters.q}%,notes.ilike.%${filters.q}%`
      );
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.minAmount) {
      query = query.gte('total_amount', filters.minAmount);
    }
    if (filters?.maxAmount) {
      query = query.lte('total_amount', filters.maxAmount);
    }

    if (filters?.assignedDriver && filters.assignedDriver !== 'all') {
      query = query.eq('assigned_driver', filters.assignedDriver);
    }

    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getOrder(id: string): Promise<Order> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createOrder(input: CreateOrderInput): Promise<{ id: string }> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Order must include at least one item');
    }

    const salespersonId = input.salesperson_id || this.userTelegramId;
    const status = input.status || 'new';
    const now = this.now();
    const totalAmount =
      typeof input.total_amount === 'number'
        ? input.total_amount
        : input.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    const payload = {
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_address: input.customer_address,
      notes: input.notes || null,
      delivery_date: input.delivery_date || null,
      status,
      items: input.items,
      total_amount: totalAmount,
      entry_mode: input.entry_mode,
      raw_order_text: input.raw_order_text || null,
      created_by: this.userTelegramId,
      salesperson_id: salespersonId,
      business_id: input.business_id || null,
      created_at: now,
      updated_at: now
    };

    const { data: orderRow, error: orderError } = await this.supabase
      .from('orders')
      .insert(payload)
      .select('id')
      .single();

    if (orderError) throw orderError;

    logger.info('Order created successfully', { orderId: orderRow.id, customerId: input.customer_name });
    return { id: orderRow.id };
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update({
        ...updates,
        updated_at: this.now()
      })
      .eq('id', id);

    if (error) throw error;
    logger.info('Order updated successfully', { orderId: id });
  }

  async deleteOrder(id: string): Promise<void> {
    const { error } = await this.supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    logger.info('Order deleted', { orderId: id });
  }

  async assignDriverToOrder(orderId: string, driverId: string): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update({
        assigned_driver: driverId,
        status: 'assigned',
        updated_at: this.now()
      })
      .eq('id', orderId);

    if (error) throw error;
    logger.info('Driver assigned to order', { orderId, driverId });
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await this.supabase
      .from('orders')
      .update({
        status,
        updated_at: this.now()
      })
      .eq('id', orderId);

    if (error) throw error;
    logger.info('Order status updated', { orderId, status });
  }
}
