import React from 'react';
import { RoyalDashboardChartPoint } from '../../data/types';
import { colors } from '../../styles/design-system';

interface RevenueChartProps {
  data: RoyalDashboardChartPoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
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
  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 100;
    const y = 100 - (point.value / maxValue) * 100;
    return `${x},${y}`;
  });

  const gradientId = `revenue-line-${Math.round(Math.random() * 10000)}`;
  const chartColor = colors.status.success;

  return (
    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points.join(' ')} 100,100`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={chartColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: colors.text.secondary,
          paddingTop: '6px'
        }}
      >
        {data.map(point => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}
