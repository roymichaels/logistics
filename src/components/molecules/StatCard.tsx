import React from 'react';
import { Card } from './Card';
import { modernTokens, getStatusGradient } from '../../styles/modernTokens';

interface StatCardProps {
  icon?: string;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'revenue' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
  trend,
  trendValue,
  variant = 'default',
  onClick
}: StatCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getGradientByVariant = (variant: string): string => {
    const gradients: Record<string, string> = {
      revenue: modernTokens.gradients.primary,
      success: modernTokens.gradients.success,
      warning: modernTokens.gradients.warning,
      error: modernTokens.gradients.error,
      default: 'none',
    };
    return gradients[variant] || 'none';
  };

  const getColorByVariant = (variant: string): string => {
    const colors: Record<string, string> = {
      revenue: modernTokens.colors.brand.primary,
      success: modernTokens.colors.status.success,
      warning: modernTokens.colors.status.warning,
      error: modernTokens.colors.status.error,
      default: modernTokens.colors.text.primary,
    };
    return color || colors[variant] || modernTokens.colors.text.primary;
  };

  const gradient = getGradientByVariant(variant);
  const valueColor = getColorByVariant(variant);

  const getTrendIcon = () => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return modernTokens.colors.status.success;
    if (trend === 'down') return modernTokens.colors.status.error;
    return modernTokens.colors.text.secondary;
  };

  return (
    <Card
      onClick={onClick}
      hoverable={!!onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient overlay */}
      {gradient !== 'none' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: gradient,
            opacity: isHovered ? 0.15 : 0.08,
            pointerEvents: 'none',
            transition: modernTokens.transitions.normal,
          }}
        />
      )}

      <div style={{
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        {icon && (
          <div style={{
            fontSize: '40px',
            marginBottom: modernTokens.spacing.md,
            filter: isHovered ? `drop-shadow(${modernTokens.glows.subtle})` : 'none',
            transition: modernTokens.transitions.normal,
          }}>
            {icon}
          </div>
        )}

        <div style={{
          fontSize: modernTokens.typography.fontSize['3xl'],
          fontWeight: modernTokens.typography.fontWeight.bold,
          color: valueColor,
          marginBottom: modernTokens.spacing.xs,
          textShadow: isHovered && variant !== 'default'
            ? `${modernTokens.glows.subtle}`
            : 'none',
          transition: modernTokens.transitions.normal,
        }}>
          {value}
        </div>

        <div style={{
          fontSize: modernTokens.typography.fontSize.sm,
          color: modernTokens.colors.text.secondary,
          fontWeight: modernTokens.typography.fontWeight.medium,
          marginTop: modernTokens.spacing.xs,
        }}>
          {label}
        </div>

        {(subtitle || trendValue) && (
          <div style={{
            fontSize: modernTokens.typography.fontSize.xs,
            color: modernTokens.colors.text.tertiary,
            marginTop: modernTokens.spacing.sm,
            opacity: 0.9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: modernTokens.spacing.xs,
          }}>
            {trendValue && trend && (
              <span style={{
                color: getTrendColor(),
                fontWeight: modernTokens.typography.fontWeight.semibold,
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}>
                <span style={{ fontSize: '14px' }}>{getTrendIcon()}</span>
                {trendValue}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
