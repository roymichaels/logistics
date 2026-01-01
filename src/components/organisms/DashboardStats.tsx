import React from 'react';
import { StatCard } from '../molecules/cards/StatCard';
import { Grid } from '../atoms/Grid';
import { TELEGRAM_THEME } from '../../styles/telegramTheme';

export interface DashboardStatsProps {
  stats: {
    label: string;
    value: string | number;
    icon?: string;
    iconColor?: string;
    trend?: {
      value: number;
      isPositive: boolean;
    };
    subtitle?: string;
    onClick?: () => void;
  }[];
  loading?: boolean;
  columns?: number;
}

export function DashboardStats({
  stats,
  loading = false,
  columns = 4,
}: DashboardStatsProps) {
  return (
    <Grid
      columns={columns}
      gap={TELEGRAM_THEME.spacing.md}
      style={{
        width: '100%',
      }}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.label}
          value={stat.value}
          icon={stat.icon}
          iconColor={stat.iconColor}
          trend={stat.trend}
          subtitle={stat.subtitle}
          onClick={stat.onClick}
          loading={loading}
        />
      ))}
    </Grid>
  );
}
