/**
 * MetricCard Component
 * Reusable metric card with multiple variants for dashboard KPIs
 */

import React from 'react';
import { colors, spacing, typography, borderRadius, shadows, gradients } from '../../styles/theme';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  size = 'medium',
  onClick,
}: MetricCardProps) {
  const isClickable = !!onClick;

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: gradients.primary,
          color: colors.white,
          boxShadow: shadows.glow,
        };
      case 'success':
        return {
          background: gradients.success,
          color: colors.white,
          boxShadow: '0 0 16px rgba(0, 186, 124, 0.4)',
        };
      case 'warning':
        return {
          background: gradients.warning,
          color: '#1a0a00',
          boxShadow: '0 0 16px rgba(255, 173, 31, 0.4)',
        };
      case 'error':
        return {
          background: gradients.error,
          color: colors.white,
          boxShadow: '0 0 16px rgba(244, 33, 46, 0.4)',
        };
      default:
        return {
          background: colors.ui.card,
          border: `1px solid ${colors.border.primary}`,
          color: colors.text.primary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: spacing.lg,
          gap: spacing.sm,
          valueSize: typography.fontSize['2xl'],
          labelSize: typography.fontSize.xs,
        };
      case 'large':
        return {
          padding: spacing['3xl'],
          gap: spacing.lg,
          valueSize: typography.fontSize['4xl'],
          labelSize: typography.fontSize.base,
        };
      default:
        return {
          padding: spacing.xl,
          gap: spacing.md,
          valueSize: typography.fontSize['3xl'],
          labelSize: typography.fontSize.sm,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const backgroundStyle = getBackgroundStyle();

  const cardStyle: React.CSSProperties = {
    ...backgroundStyle,
    borderRadius: borderRadius.xl,
    padding: sizeStyles.padding,
    boxShadow: backgroundStyle.boxShadow || shadows.sm,
    transition: 'all 200ms ease-in-out',
    cursor: isClickable ? 'pointer' : 'default',
    display: 'flex',
    flexDirection: 'column',
    gap: sizeStyles.gap,
    position: 'relative',
    overflow: 'hidden',
  };

  const hoverStyle: React.CSSProperties = isClickable ? {
    transform: 'translateY(-2px)',
    boxShadow: shadows.md,
  } : {};

  const [isHovered, setIsHovered] = React.useState(false);

  const labelColor = variant === 'default'
    ? colors.text.secondary
    : variant === 'warning'
      ? 'rgba(26, 10, 0, 0.7)'
      : 'rgba(255, 255, 255, 0.9)';

  const subtitleColor = variant === 'default'
    ? colors.text.tertiary
    : variant === 'warning'
      ? 'rgba(26, 10, 0, 0.6)'
      : 'rgba(255, 255, 255, 0.8)';

  return (
    <div
      style={{
        ...cardStyle,
        ...(isHovered && isClickable ? hoverStyle : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {icon && (
        <div style={{
          fontSize: size === 'large' ? '48px' : size === 'small' ? '28px' : '36px',
          marginBottom: sizeStyles.gap,
        }}>
          {icon}
        </div>
      )}

      <div style={{
        fontSize: sizeStyles.labelSize,
        color: labelColor,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
      }}>
        {label}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: spacing.sm,
        flexWrap: 'wrap' as const,
      }}>
        <div style={{
          fontSize: sizeStyles.valueSize,
          fontWeight: typography.fontWeight.bold,
          lineHeight: '1.2',
        }}>
          {value}
        </div>

        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: `4px ${spacing.sm}`,
            background: trend.isPositive
              ? 'rgba(0, 186, 124, 0.2)'
              : 'rgba(244, 33, 46, 0.2)',
            borderRadius: borderRadius.md,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: trend.isPositive ? colors.status.success : colors.status.error,
          }}>
            <span>{trend.isPositive ? '▲' : '▼'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div style={{
          fontSize: typography.fontSize.sm,
          color: subtitleColor,
          fontWeight: typography.fontWeight.normal,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export interface MetricGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function MetricGrid({ children, columns = 4 }: MetricGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 2 ? '300px' : columns === 3 ? '240px' : '200px'}, 1fr))`,
      gap: spacing.lg,
      marginBottom: spacing['2xl'],
    }}>
      {children}
    </div>
  );
}
