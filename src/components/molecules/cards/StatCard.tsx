import React from 'react';
import { Card } from '../Card';
import { Typography } from '../../atoms/Typography';
import { Icon } from '../../atoms/Icon';
import { TELEGRAM_THEME } from '../../../styles/telegramTheme';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon,
  iconColor,
  trend,
  subtitle,
  onClick,
  loading = false,
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: TELEGRAM_THEME.transitions.normal,
      }}
      hoverable={!!onClick}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: TELEGRAM_THEME.spacing.md,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ flex: 1 }}>
            <Typography variant="body2" color="secondary" style={{ marginBottom: TELEGRAM_THEME.spacing.xs }}>
              {title}
            </Typography>

            {loading ? (
              <div
                style={{
                  width: '80px',
                  height: '32px',
                  background: TELEGRAM_THEME.colors.background.hover,
                  borderRadius: TELEGRAM_THEME.radius.md,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ) : (
              <Typography variant="h2" weight="bold">
                {value}
              </Typography>
            )}

            {subtitle && (
              <Typography variant="caption" color="secondary" style={{ marginTop: TELEGRAM_THEME.spacing.xs }}>
                {subtitle}
              </Typography>
            )}
          </div>

          {icon && (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: TELEGRAM_THEME.radius.lg,
                background: iconColor
                  ? `${iconColor}20`
                  : TELEGRAM_THEME.colors.background.hover,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={icon} size={24} color={iconColor || TELEGRAM_THEME.colors.text.primary} />
            </div>
          )}
        </div>

        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: TELEGRAM_THEME.spacing.xs,
            }}
          >
            <Icon
              name={trend.isPositive ? 'trending-up' : 'trending-down'}
              size={16}
              color={
                trend.isPositive
                  ? TELEGRAM_THEME.colors.status.success
                  : TELEGRAM_THEME.colors.status.error
              }
            />
            <Typography
              variant="caption"
              color={trend.isPositive ? 'success' : 'error'}
              weight="medium"
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </Typography>
          </div>
        )}
      </div>
    </Card>
  );
}
