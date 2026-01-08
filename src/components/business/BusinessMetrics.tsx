import React from 'react';
import { MetricCard } from '../dashboard/MetricCard';
import { formatCurrency, formatNumber } from '../../utils/businessFormatters';
import type { BusinessStats } from '../../hooks/useBusinessStats';

interface BusinessMetricsProps {
  stats: BusinessStats;
  currency?: string;
}

export function BusinessMetrics({ stats, currency = 'ILS' }: BusinessMetricsProps) {
  const orderCompletionRate = stats.totalOrders > 0
    ? (stats.completedOrders / stats.totalOrders) * 100
    : 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
      }}
    >
      <MetricCard
        label="סה״כ הזמנות"
        value={formatNumber(stats.totalOrders)}
        change={stats.recentOrders > 0 ? `+${stats.recentOrders} היום` : undefined}
        trend={stats.recentOrders > 0 ? 'up' : undefined}
        icon="📦"
      />

      <MetricCard
        label="הזמנות ממתינות"
        value={formatNumber(stats.pendingOrders)}
        icon="⏳"
      />

      <MetricCard
        label="הכנסות כוללות"
        value={formatCurrency(stats.totalRevenue, currency)}
        icon="💰"
      />

      <MetricCard
        label="ממוצע הזמנה"
        value={formatCurrency(stats.averageOrderValue, currency)}
        icon="📊"
      />

      <MetricCard
        label="חברי צוות פעילים"
        value={formatNumber(stats.activeTeamMembers)}
        icon="👥"
      />

      <MetricCard
        label="נהגים זמינים"
        value={`${formatNumber(stats.availableDrivers)}/${formatNumber(stats.totalDrivers)}`}
        icon="🚗"
      />

      <MetricCard
        label="פריטים במלאי נמוך"
        value={formatNumber(stats.lowStockItems)}
        icon="⚠️"
        trend={stats.lowStockItems > 0 ? 'down' : undefined}
      />

      <MetricCard
        label="שיעור השלמה"
        value={`${orderCompletionRate.toFixed(1)}%`}
        icon="✅"
        trend={orderCompletionRate > 80 ? 'up' : orderCompletionRate < 50 ? 'down' : undefined}
      />
    </div>
  );
}
