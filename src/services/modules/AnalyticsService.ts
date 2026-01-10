import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { BaseService } from './BaseService';

export interface BusinessKPIs {
  revenue: {
    total: number;
    trend: number;
    byPeriod: { date: string; amount: number }[];
  };
  orders: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    trend: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    trend: number;
  };
  inventory: {
    totalProducts: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  drivers: {
    active: number;
    total: number;
    avgRating: number;
    completionRate: number;
  };
}

export interface DriverPerformance {
  driverId: string;
  driverName: string;
  completedDeliveries: number;
  totalDeliveries: number;
  avgRating: number;
  totalEarnings: number;
  onTimeRate: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
  avgRating: number | null;
  stockLevel: number;
}

export interface RevenueByCategory {
  category: string;
  revenue: number;
  orderCount: number;
  percentage: number;
}

export interface TimeSeries {
  date: string;
  value: number;
  label?: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export class AnalyticsService extends BaseService {
  /**
   * Get comprehensive business KPIs for a given business
   */
  async getBusinessKPIs(
    businessId: string,
    dateRange?: DateRangeFilter
  ): Promise<BusinessKPIs> {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const [revenue, orders, customers, inventory, drivers] = await Promise.all([
        this.getRevenueMetrics(businessId, startDate, endDate),
        this.getOrderMetrics(businessId, startDate, endDate),
        this.getCustomerMetrics(businessId, startDate, endDate),
        this.getInventoryMetrics(businessId),
        this.getDriverMetrics(businessId)
      ]);

      return {
        revenue,
        orders,
        customers,
        inventory,
        drivers
      };
    } catch (error) {
      logger.error('[AnalyticsService] Failed to get business KPIs:', error);
      throw error;
    }
  }

  /**
   * Get revenue metrics including trend
   */
  private async getRevenueMetrics(
    businessId: string,
    startDate: string,
    endDate: string
  ): Promise<BusinessKPIs['revenue']> {
    const { data: orders } = await supabase
      .from('orders')
      .select('total_price, created_at')
      .eq('business_id', businessId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'completed');

    const total = orders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(
      previousPeriodStart.getDate() - this.getPeriodDays(startDate, endDate)
    );

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('total_price')
      .eq('business_id', businessId)
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate)
      .eq('status', 'completed');

    const prevTotal = prevOrders?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
    const trend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    const byPeriod = this.groupByPeriod(
      orders || [],
      'created_at',
      'total_price'
    );

    return { total, trend, byPeriod };
  }

  /**
   * Get order metrics
   */
  private async getOrderMetrics(
    businessId: string,
    startDate: string,
    endDate: string
  ): Promise<BusinessKPIs['orders']> {
    const { data: orders } = await supabase
      .from('orders')
      .select('status')
      .eq('business_id', businessId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const total = orders?.length || 0;
    const completed = orders?.filter(o => o.status === 'completed').length || 0;
    const pending = orders?.filter(o => ['pending', 'processing'].includes(o.status)).length || 0;
    const cancelled = orders?.filter(o => o.status === 'cancelled').length || 0;

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('business_id', businessId)
      .gte('created_at', this.getPreviousPeriodStart(startDate, endDate))
      .lt('created_at', startDate);

    const prevTotal = prevOrders?.length || 0;
    const trend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return { total, completed, pending, cancelled, trend };
  }

  /**
   * Get customer metrics
   */
  private async getCustomerMetrics(
    businessId: string,
    startDate: string,
    endDate: string
  ): Promise<BusinessKPIs['customers']> {
    const { data: orders } = await supabase
      .from('orders')
      .select('customer_id, created_at')
      .eq('business_id', businessId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const uniqueCustomers = new Set(orders?.map(o => o.customer_id) || []);
    const total = uniqueCustomers.size;

    const customerFirstOrders = new Map<string, string>();
    const { data: allOrders } = await supabase
      .from('orders')
      .select('customer_id, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    allOrders?.forEach(order => {
      if (!customerFirstOrders.has(order.customer_id)) {
        customerFirstOrders.set(order.customer_id, order.created_at);
      }
    });

    let newCustomers = 0;
    let returning = 0;

    uniqueCustomers.forEach(customerId => {
      const firstOrderDate = customerFirstOrders.get(customerId);
      if (firstOrderDate && firstOrderDate >= startDate && firstOrderDate <= endDate) {
        newCustomers++;
      } else {
        returning++;
      }
    });

    const { data: prevOrders } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('business_id', businessId)
      .gte('created_at', this.getPreviousPeriodStart(startDate, endDate))
      .lt('created_at', startDate);

    const prevTotal = new Set(prevOrders?.map(o => o.customer_id) || []).size;
    const trend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

    return { total, new: newCustomers, returning, trend };
  }

  /**
   * Get inventory metrics
   */
  private async getInventoryMetrics(businessId: string): Promise<BusinessKPIs['inventory']> {
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('business_id', businessId)
      .eq('active', true);

    const totalProducts = products?.length || 0;

    const { data: inventory } = await supabase
      .from('inventory')
      .select('product_id, quantity, low_stock_threshold, unit_cost')
      .eq('business_id', businessId);

    let lowStock = 0;
    let outOfStock = 0;
    let totalValue = 0;

    inventory?.forEach(item => {
      if (item.quantity === 0) outOfStock++;
      else if (item.quantity <= (item.low_stock_threshold || 10)) lowStock++;
      totalValue += item.quantity * (item.unit_cost || 0);
    });

    return { totalProducts, lowStock, outOfStock, totalValue };
  }

  /**
   * Get driver metrics
   */
  private async getDriverMetrics(businessId: string): Promise<BusinessKPIs['drivers']> {
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, rating')
      .eq('business_id', businessId);

    const total = drivers?.length || 0;

    const { data: activeDrivers } = await supabase
      .from('driver_status')
      .select('driver_id')
      .eq('status', 'active')
      .eq('is_online', true);

    const active = activeDrivers?.length || 0;

    const avgRating =
      drivers && drivers.length > 0
        ? drivers.reduce((sum, d) => sum + (d.rating || 0), 0) / drivers.length
        : 0;

    const { data: assignments } = await supabase
      .from('driver_assignments')
      .select('status')
      .eq('business_id', businessId);

    const completed = assignments?.filter(a => a.status === 'completed').length || 0;
    const totalAssignments = assignments?.length || 0;
    const completionRate = totalAssignments > 0 ? (completed / totalAssignments) * 100 : 0;

    return { active, total, avgRating, completionRate };
  }

  /**
   * Get driver performance leaderboard
   */
  async getDriverPerformance(
    businessId: string,
    dateRange?: DateRangeFilter,
    limit: number = 10
  ): Promise<DriverPerformance[]> {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const { data: assignments } = await supabase
        .from('driver_assignments')
        .select(`
          driver_id,
          status,
          drivers!inner(id, name, rating)
        `)
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const driverStats = new Map<string, any>();

      assignments?.forEach(assignment => {
        const driverId = assignment.driver_id;
        if (!driverStats.has(driverId)) {
          driverStats.set(driverId, {
            driverId,
            driverName: (assignment as any).drivers.name || 'Unknown',
            completedDeliveries: 0,
            totalDeliveries: 0,
            avgRating: (assignment as any).drivers.rating || 0,
            totalEarnings: 0,
            onTimeRate: 0
          });
        }

        const stats = driverStats.get(driverId);
        stats.totalDeliveries++;
        if (assignment.status === 'completed') {
          stats.completedDeliveries++;
        }
      });

      return Array.from(driverStats.values())
        .sort((a, b) => b.completedDeliveries - a.completedDeliveries)
        .slice(0, limit);
    } catch (error) {
      logger.error('[AnalyticsService] Failed to get driver performance:', error);
      throw error;
    }
  }

  /**
   * Get product performance analytics
   */
  async getProductPerformance(
    businessId: string,
    dateRange?: DateRangeFilter,
    limit: number = 10
  ): Promise<ProductPerformance[]> {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          orders!inner(business_id, created_at),
          products!inner(name)
        `)
        .eq('orders.business_id', businessId)
        .gte('orders.created_at', startDate)
        .lte('orders.created_at', endDate);

      const productStats = new Map<string, any>();

      orderItems?.forEach(item => {
        const productId = item.product_id;
        if (!productStats.has(productId)) {
          productStats.set(productId, {
            productId,
            productName: (item as any).products.name || 'Unknown',
            totalSold: 0,
            revenue: 0,
            avgRating: null,
            stockLevel: 0
          });
        }

        const stats = productStats.get(productId);
        stats.totalSold += item.quantity;
        stats.revenue += item.quantity * item.price;
      });

      const productIds = Array.from(productStats.keys());
      if (productIds.length > 0) {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('product_id, quantity')
          .eq('business_id', businessId)
          .in('product_id', productIds);

        inventory?.forEach(inv => {
          const stats = productStats.get(inv.product_id);
          if (stats) {
            stats.stockLevel = inv.quantity;
          }
        });
      }

      return Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (error) {
      logger.error('[AnalyticsService] Failed to get product performance:', error);
      throw error;
    }
  }

  /**
   * Get revenue time series data
   */
  async getRevenueTimeSeries(
    businessId: string,
    dateRange?: DateRangeFilter
  ): Promise<TimeSeries[]> {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const { data: orders } = await supabase
        .from('orders')
        .select('total_price, created_at')
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      return this.groupByPeriod(orders || [], 'created_at', 'total_price');
    } catch (error) {
      logger.error('[AnalyticsService] Failed to get revenue time series:', error);
      throw error;
    }
  }

  /**
   * Get order volume time series
   */
  async getOrderTimeSeries(
    businessId: string,
    dateRange?: DateRangeFilter
  ): Promise<TimeSeries[]> {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange);

      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('business_id', businessId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      return this.groupByPeriodCount(orders || [], 'created_at');
    } catch (error) {
      logger.error('[AnalyticsService] Failed to get order time series:', error);
      throw error;
    }
  }

  private getDateRange(dateRange?: DateRangeFilter): { startDate: string; endDate: string } {
    const endDate = dateRange?.endDate || new Date().toISOString();
    let startDate = dateRange?.startDate;

    if (!startDate) {
      const start = new Date(endDate);
      switch (dateRange?.period) {
        case 'day':
          start.setDate(start.getDate() - 1);
          break;
        case 'week':
          start.setDate(start.getDate() - 7);
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - 1);
          break;
        case 'month':
        default:
          start.setMonth(start.getMonth() - 1);
      }
      startDate = start.toISOString();
    }

    return { startDate, endDate };
  }

  private getPeriodDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getPreviousPeriodStart(startDate: string, endDate: string): string {
    const days = this.getPeriodDays(startDate, endDate);
    const start = new Date(startDate);
    start.setDate(start.getDate() - days);
    return start.toISOString();
  }

  private groupByPeriod(
    data: any[],
    dateField: string,
    valueField: string
  ): TimeSeries[] {
    const groups = new Map<string, number>();

    data.forEach(item => {
      const date = new Date(item[dateField]);
      const key = date.toISOString().split('T')[0];
      groups.set(key, (groups.get(key) || 0) + (item[valueField] || 0));
    });

    return Array.from(groups.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private groupByPeriodCount(data: any[], dateField: string): TimeSeries[] {
    const groups = new Map<string, number>();

    data.forEach(item => {
      const date = new Date(item[dateField]);
      const key = date.toISOString().split('T')[0];
      groups.set(key, (groups.get(key) || 0) + 1);
    });

    return Array.from(groups.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
