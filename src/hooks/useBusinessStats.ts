import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export interface BusinessStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  activeTeamMembers: number;
  totalDrivers: number;
  availableDrivers: number;
  activeDrivers: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalProducts: number;
  recentOrders: number;
  lastUpdated: Date;
}

export interface UseBusinessStatsOptions {
  businessId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useBusinessStats(options: UseBusinessStatsOptions = {}) {
  const { businessId, autoRefresh = false, refreshInterval = 30000 } = options;

  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const [
        orderStatsResult,
        teamCountResult,
        driverCountResult,
        inventoryStatsResult,
        productsResult,
        driversResult
      ] = await Promise.all([
        supabase.rpc('get_business_order_stats', { p_business_id: businessId }).then(r => ({ data: r.data, error: r.error })),
        supabase.rpc('get_business_team_count', { p_business_id: businessId }).then(r => ({ data: r.data, error: r.error })),
        supabase.rpc('get_business_driver_count', { p_business_id: businessId }).then(r => ({ data: r.data, error: r.error })),
        supabase.rpc('get_business_inventory_stats', { p_business_id: businessId }).then(r => ({ data: r.data, error: r.error })),
        supabase
          .from('products')
          .select('id')
          .eq('business_id', businessId)
          .then(r => ({ data: r.data, error: r.error })),
        supabase
          .from('driver_profiles')
          .select('id, active')
          .eq('business_id', businessId)
          .eq('active', true)
          .then(r => ({ data: r.data, error: r.error }))
      ]);

      const orderStats = orderStatsResult.data || {
        total_orders: 0,
        pending_orders: 0,
        active_orders: 0,
        completed_orders: 0,
        total_revenue: 0
      };

      const totalOrders = Number(orderStats.total_orders) || 0;
      const pendingOrders = Number(orderStats.pending_orders) || 0;
      const completedOrders = Number(orderStats.completed_orders) || 0;
      const totalRevenue = Number(orderStats.total_revenue) || 0;
      const cancelledOrders = 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const activeTeamMembers = teamCountResult.data || 0;
      const totalDrivers = driverCountResult.data || 0;

      const availableDrivers = driversResult.data?.length || 0;
      const activeDrivers = driversResult.data?.length || 0;

      const inventoryStats = inventoryStatsResult.data || {
        total_products: 0,
        total_quantity: 0,
        low_stock_count: 0
      };

      const lowStockItems = Number(inventoryStats.low_stock_count) || 0;
      const outOfStockItems = 0;
      const totalProducts = productsResult.data?.length || 0;

      const recentOrders = Number(orderStats.pending_orders) || 0;

      const newStats: BusinessStats = {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
        activeTeamMembers,
        totalDrivers,
        availableDrivers,
        activeDrivers,
        lowStockItems,
        outOfStockItems,
        totalProducts,
        recentOrders,
        lastUpdated: new Date()
      };

      setStats(newStats);
      logger.debug('[useBusinessStats] Stats loaded', newStats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load business stats');
      setError(error);
      logger.error('[useBusinessStats] Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh || !businessId) {
      return;
    }

    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, businessId, refreshInterval, fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
}
