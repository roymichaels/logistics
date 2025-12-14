import React from 'react';
import { RoyalDashboardChartPoint } from '../../data/types';
import { colors, shadows } from '../../styles/design-system';

interface OrdersChartProps {
  data: RoyalDashboardChartPoint[];
}

export function OrdersChart({ data }: OrdersChartProps) {
  if (data.length === 0) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: colors.text.secondary
      }}>
        אין נתונים להצגה
      </div>
    );
  }

  const maxValue = Math.max(...data.map(point => point.value), 1);
  const chartColor = colors.brand.primary;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '220px' }}>
      {data.map(point => {
        const height = (point.value / maxValue) * 100;
        return (
          <div key={point.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '100%',
                height: `${Math.max(height, 6)}%`,
                borderRadius: '12px 12px 4px 4px',
                background: chartColor,
                boxShadow: shadows.sm
              }}
            />
            <span style={{ fontSize: '11px', color: colors.text.secondary }}>{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}
