/**
 * Order Management Service
 *
 * Comprehensive order management including creation from cart,
 * status tracking, fulfillment, payments, and order history.
 */

import { BaseService } from '../base/BaseService';
import { logger } from '../../lib/logger';

export interface Order {
  id: string;
  business_id: string;
  order_number: string;
  customer_profile_id: string | null;
  guest_checkout_id: string | null;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address_snapshot: Record<string, any> | null;
  billing_address_snapshot: Record<string, any> | null;
  customer_notes: string | null;
  internal_notes: string | null;
  payment_method: string | null;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_amount: number;
  discount_amount: number;
  product_snapshot: Record<string, any> | null;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: string;
  previous_status: string | null;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  transaction_id: string | null;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  gateway_response: Record<string, any> | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface CreateOrderFromCartInput {
  cart_id: string;
  customer_profile_id?: string;
  guest_checkout_id?: string;
  shipping_address_id?: string;
  billing_address_id?: string;
  payment_method: string;
  customer_notes?: string;
  shipping_amount?: number;
  tax_amount?: number;
  discount_amount?: number;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  payments: PaymentTransaction[];
}

export class OrderManagementService extends BaseService {
  // ===== Order Creation =====

  async createOrderFromCart(input: CreateOrderFromCartInput): Promise<Order> {
    try {
      const { data: cart } = await this.supabase
        .from('shopping_carts')
        .select('*, items:cart_items(*)')
        .eq('id', input.cart_id)
        .single();

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error('Cart is empty or not found');
      }

      const subtotal = cart.items.reduce((sum: number, item: any) => {
        return sum + (item.unit_price * item.quantity);
      }, 0);

      const taxAmount = input.tax_amount || 0;
      const shippingAmount = input.shipping_amount || 0;
      const discountAmount = input.discount_amount || 0;
      const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

      const { data: orderNumber } = await this.supabase
        .rpc('generate_order_number', { p_business_id: cart.business_id });

      let shippingSnapshot = null;
      let billingSnapshot = null;

      if (input.shipping_address_id) {
        const { data: addr } = await this.supabase
          .from('customer_addresses')
          .select('*')
          .eq('id', input.shipping_address_id)
          .single();
        shippingSnapshot = addr;
      }

      if (input.billing_address_id) {
        const { data: addr } = await this.supabase
          .from('customer_addresses')
          .select('*')
          .eq('id', input.billing_address_id)
          .single();
        billingSnapshot = addr;
      }

      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          business_id: cart.business_id,
          order_number: orderNumber,
          customer_profile_id: input.customer_profile_id,
          guest_checkout_id: input.guest_checkout_id,
          status: 'pending',
          subtotal,
          tax_amount: taxAmount,
          shipping_amount: shippingAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          currency: cart.currency,
          shipping_address_snapshot: shippingSnapshot,
          billing_address_snapshot: billingSnapshot,
          customer_notes: input.customer_notes,
          payment_method: input.payment_method,
          payment_status: 'pending',
          fulfillment_status: 'unfulfilled'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.items.map((item: any) => {
        const itemTotal = item.unit_price * item.quantity;
        return {
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: 'Product',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: itemTotal,
          tax_amount: 0,
          discount_amount: 0
        };
      });

      const { error: itemsError } = await this.supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await this.supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', input.cart_id);

      logger.info('Order created from cart', {
        orderId: order.id,
        orderNumber: order.order_number,
        totalAmount
      });

      return order;
    } catch (error) {
      logger.error('Failed to create order from cart:', error);
      throw error;
    }
  }

  // ===== Order Retrieval =====

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get order:', error);
      throw error;
    }
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get order by number:', error);
      throw error;
    }
  }

  async getOrderWithDetails(orderId: string): Promise<OrderWithDetails | null> {
    try {
      const [order, items, history, payments] = await Promise.all([
        this.getOrder(orderId),
        this.getOrderItems(orderId),
        this.getOrderStatusHistory(orderId),
        this.getOrderPayments(orderId)
      ]);

      if (!order) return null;

      return {
        ...order,
        items,
        statusHistory: history,
        payments
      };
    } catch (error) {
      logger.error('Failed to get order with details:', error);
      throw error;
    }
  }

  async listOrders(filters?: {
    customer_profile_id?: string;
    status?: string;
    payment_status?: string;
    fulfillment_status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<Order[]> {
    try {
      let query = this.supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.customer_profile_id) {
        query = query.eq('customer_profile_id', filters.customer_profile_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }

      if (filters?.fulfillment_status) {
        query = query.eq('fulfillment_status', filters.fulfillment_status);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list orders:', error);
      throw error;
    }
  }

  // ===== Order Items =====

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get order items:', error);
      throw error;
    }
  }

  // ===== Order Status Management =====

  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      if (notes) {
        await this.supabase
          .from('order_status_history')
          .insert({
            order_id: orderId,
            status,
            notes,
            changed_by: this.userTelegramId
          });
      }

      logger.info('Order status updated', { orderId, status });
    } catch (error) {
      logger.error('Failed to update order status:', error);
      throw error;
    }
  }

  async updatePaymentStatus(orderId: string, paymentStatus: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId);

      if (error) throw error;

      logger.info('Payment status updated', { orderId, paymentStatus });
    } catch (error) {
      logger.error('Failed to update payment status:', error);
      throw error;
    }
  }

  async updateFulfillmentStatus(
    orderId: string,
    fulfillmentStatus: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('orders')
        .update({ fulfillment_status: fulfillmentStatus })
        .eq('id', orderId);

      if (error) throw error;

      logger.info('Fulfillment status updated', { orderId, fulfillmentStatus });
    } catch (error) {
      logger.error('Failed to update fulfillment status:', error);
      throw error;
    }
  }

  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get order status history:', error);
      throw error;
    }
  }

  // ===== Payment Management =====

  async createPaymentTransaction(
    orderId: string,
    paymentMethod: string,
    amount: number,
    transactionId?: string
  ): Promise<PaymentTransaction> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .insert({
          order_id: orderId,
          transaction_id: transactionId,
          payment_method: paymentMethod,
          amount,
          currency: 'ILS',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Payment transaction created', { transactionId: data.id, orderId });
      return data;
    } catch (error) {
      logger.error('Failed to create payment transaction:', error);
      throw error;
    }
  }

  async updatePaymentTransaction(
    transactionId: string,
    status: string,
    gatewayResponse?: Record<string, any>,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        processed_at: new Date().toISOString()
      };

      if (gatewayResponse) {
        updateData.gateway_response = gatewayResponse;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await this.supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) throw error;

      logger.info('Payment transaction updated', { transactionId, status });
    } catch (error) {
      logger.error('Failed to update payment transaction:', error);
      throw error;
    }
  }

  async getOrderPayments(orderId: string): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get order payments:', error);
      throw error;
    }
  }

  // ===== Order Notes =====

  async addInternalNote(orderId: string, note: string): Promise<void> {
    try {
      const order = await this.getOrder(orderId);
      if (!order) throw new Error('Order not found');

      const existingNotes = order.internal_notes || '';
      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = existingNotes
        ? `${existingNotes}\n${newNote}`
        : newNote;

      const { error } = await this.supabase
        .from('orders')
        .update({ internal_notes: updatedNotes })
        .eq('id', orderId);

      if (error) throw error;

      logger.info('Internal note added', { orderId });
    } catch (error) {
      logger.error('Failed to add internal note:', error);
      throw error;
    }
  }

  // ===== Order Statistics =====

  async getOrderStats(businessId: string, dateFrom?: string, dateTo?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    pendingOrders: number;
    completedOrders: number;
  }> {
    try {
      let query = this.supabase
        .from('orders')
        .select('status, total_amount')
        .eq('business_id', businessId);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = data || [];
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        pendingOrders,
        completedOrders
      };
    } catch (error) {
      logger.error('Failed to get order stats:', error);
      throw error;
    }
  }

  // ===== Order Cancellation =====

  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    try {
      await this.updateOrderStatus(orderId, 'cancelled', reason);
      await this.updatePaymentStatus(orderId, 'refunded');

      logger.info('Order cancelled', { orderId, reason });
    } catch (error) {
      logger.error('Failed to cancel order:', error);
      throw error;
    }
  }
}
