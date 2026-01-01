import React from 'react';
import { MetricCard } from './MetricCard';
import { DashboardMetric, MetricVariant } from './types';

interface MetricsGridProps {
  metrics: DashboardMetric[];
  columns?: number;
  variant?: MetricVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function MetricsGrid({
  metrics,
  columns = 4,
  variant = 'default',
  size = 'md',
  loading = false
}: MetricsGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 2 ? '250px' : '200px'}, 1fr))`,
    gap: '16px',
    marginBottom: '24px'
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: columns }).map((_, i) => (
          <MetricCard
            key={i}
            metric={{ id: `loading-${i}`, label: '', value: '' }}
            variant={variant}
            size={size}
            loading={true}
          />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <div style={gridStyle}>
      {metrics.map((metric) => (
        <MetricCard
          key={metric.id}
          metric={metric}
          variant={variant}
          size={size}
        />
      ))}
    </div>
  );
}
