import React from 'react';
import { colors, spacing } from '../../styles/design-system';
import { Text, Badge } from '../atoms';
import { Card } from '../molecules';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon, trend, subtitle, onClick }: StatCardProps) {
  return (
    <Card hoverable={!!onClick} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Text variant="small" color="secondary" style={{ marginBottom: spacing.xs }}>
            {title}
          </Text>
          <Text variant="h2" style={{ margin: `${spacing.sm} 0` }}>
            {value}
          </Text>
          {subtitle && (
            <Text variant="small" color="secondary">
              {subtitle}
            </Text>
          )}
        </div>
        {icon && (
          <div
            style={{
              fontSize: '32px',
              opacity: 0.5,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div style={{ marginTop: spacing.md }}>
          <Badge variant={trend.isPositive ? 'success' : 'error'} size="sm">
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </Badge>
        </div>
      )}
    </Card>
  );
}
