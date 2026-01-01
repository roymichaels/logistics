import React, { useMemo } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardConfig } from './types';
import { useDashboardData } from '@hooks/useDashboardData';
import { getDashboardConfig, createMetricsFromData, DashboardRole } from '@config/dashboards';

interface UnifiedDashboardProps {
  role: DashboardRole;
  dataFetcher: () => Promise<any>;
  onNavigate: (route: string) => void;
  children?: React.ReactNode;
  refreshInterval?: number;
}

export function UnifiedDashboard({
  role,
  dataFetcher,
  onNavigate,
  children,
  refreshInterval = 30000
}: UnifiedDashboardProps) {
  const config = getDashboardConfig(role);

  const { metrics, loading, error, refresh, data } = useDashboardData({
    fetcher: dataFetcher,
    transformer: (data) => createMetricsFromData(role, data),
    refreshInterval,
    enabled: true
  });

  const dashboardConfig = useMemo<DashboardConfig>(
    () => ({
      title: config.title,
      subtitle: config.subtitle,
      metrics,
      quickActions: config.quickActions.map((action) => ({
        id: action.id,
        label: action.label,
        icon: action.icon,
        variant: action.variant,
        onClick: () => onNavigate(action.route)
      })),
      refreshInterval,
      onRefresh: refresh
    }),
    [config, metrics, refreshInterval, refresh, onNavigate]
  );

  return (
    <DashboardLayout config={dashboardConfig} loading={loading} error={error}>
      {children}
    </DashboardLayout>
  );
}
