import React from 'react';
import { RoyalDashboardMetrics } from '../../data/types';
import { MetricCard } from './MetricCard';
import { formatCurrency } from '../../lib/i18n';

interface StatsOverviewProps {
  metrics: RoyalDashboardMetrics;
}

const numberFormatter = new Intl.NumberFormat('he-IL');

export function StatsOverview({ metrics }: StatsOverviewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <MetricCard
        label="הכנסות היום"
        value={formatCurrency(metrics.revenueToday)}
        subtitle={`נסגרו ${numberFormatter.format(metrics.deliveredToday)} משלוחים`}
        tone="gold"
        icon="₪"
      />
      <MetricCard
        label="הזמנות פעילות"
        value={numberFormatter.format(metrics.pendingOrders)}
        subtitle={`${numberFormatter.format(metrics.outstandingDeliveries)} בדרך ליעד`}
        tone="crimson"
        icon="🚨"
      />
      <MetricCard
        label="נהגים מחוברים"
        value={numberFormatter.format(metrics.activeDrivers)}
        subtitle={`כיסוי ${numberFormatter.format(metrics.coveragePercent)}% מהאזורים`}
        tone="teal"
        icon="🛰️"
      />
      <MetricCard
        label="שווי משלוח ממוצע"
        value={formatCurrency(metrics.averageOrderValue || 0)}
        subtitle="עסקאות ברמת פרימיום"
        tone="purple"
        icon="💎"
      />
    </div>
  );
}
