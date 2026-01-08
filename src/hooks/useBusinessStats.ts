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
        { data: orders },
        { data: teamMembers },
        { data: drivers },
        { data: inventory },
        { data: products }
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, status, created_at')
          .eq('business_id', businessId),
        supabase
          .from('profiles')
          .select('id, role')
          .eq('business_id', businessId),
        supabase
          .from('drivers')
          .select('id, status')
          .eq('business_id', businessId),
        supabase
          .from('inventory')
          .select('id, quantity, reorder_point')
          .eq('business_id', businessId),
        supabase
          .from('products')
          .select('id')
          .eq('business_id', businessId)
      ]);

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending' || o.status === 'confirmed').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const activeTeamMembers = teamMembers?.filter(m =>
        m.role !== 'customer' && m.role !== 'guest'
      ).length || 0;

      const totalDrivers = drivers?.length || 0;
      const availableDrivers = drivers?.filter(d => d.status === 'available').length || 0;
      const activeDrivers = drivers?.filter(d => d.status === 'active').length || 0;

      const lowStockItems = inventory?.filter(i =>
        i.quantity > 0 && i.quantity <= i.reorder_point
      ).length || 0;
      const outOfStockItems = inventory?.filter(i => i.quantity === 0).length || 0;

      const totalProducts = products?.length || 0;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const recentOrders = orders?.filter(o => new Date(o.created_at) > oneDayAgo).length || 0;

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
