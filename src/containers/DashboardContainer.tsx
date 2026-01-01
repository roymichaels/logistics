import React, { useEffect, useState } from 'react';
import { useOrders } from '../hooks/data/useOrders';
import { useOrderRepository } from '../foundation/container';
import { DashboardView } from '../views/DashboardView';
import { logger } from '../lib/logger';

interface DashboardContainerProps {
  businessId: string;
  userId: string;
  userRole: string;
  onNavigate: (page: string) => void;
}

export function DashboardContainer({
  businessId,
  userId,
  userRole,
  onNavigate,
}: DashboardContainerProps) {
  const orderRepository = useOrderRepository();
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
  });

  const {
    orders: recentOrders,
    loading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders({
    filters: { businessId },
    sort: { field: 'createdAt', direction: 'desc' },
    pageSize: 10,
    autoLoad: true,
  });

  useEffect(() => {
    loadMetrics();
  }, [businessId]);

  const loadMetrics = async () => {
    try {
      setMetricsLoading(true);
      const data = await orderRepository.getMetrics(businessId);
      setMetrics(data);
    } catch (error) {
      logger.error('Failed to load dashboard metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadMetrics(), refetchOrders()]);
  };

  return (
    <DashboardView
      metrics={metrics}
      metricsLoading={metricsLoading}
      recentOrders={recentOrders}
      ordersLoading={ordersLoading}
      ordersError={ordersError}
      onRefresh={handleRefresh}
      onNavigate={onNavigate}
      userRole={userRole}
    />
  );
}
