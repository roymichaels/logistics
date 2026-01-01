import React from 'react';
import { colors, spacing, typography, borderRadius, shadows } from '../../styles/theme';
import { ProgressBar } from '../atoms/ProgressBar';

export interface MetricCardWithProgressProps {
  label: string;
  value: string | number;
  progress: number;
  max?: number;
  subtitle?: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

export function MetricCardWithProgress({
  label,
  value,
  progress,
  max = 100,
  subtitle,
  variant = 'primary',
  onClick
}: MetricCardWithProgressProps) {
  const isClickable = !!onClick;
  const [isHovered, setIsHovered] = React.useState(false);

  const cardStyle: React.CSSProperties = {
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    boxShadow: shadows.sm,
    transition: 'all 200ms ease-in-out',
    cursor: isClickable ? 'pointer' : 'default',
    position: 'relative',
    overflow: 'hidden'
  };

  const hoverStyle: React.CSSProperties = isClickable
    ? {
        transform: 'translateY(-2px)',
        boxShadow: shadows.md,
        borderColor: colors.border.hover
      }
    : {};

  return (
    <div
      style={{
        ...cardStyle,
        ...(isHovered && isClickable ? hoverStyle : {})
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text.secondary,
          fontWeight: typography.fontWeight.medium,
          marginBottom: spacing.sm
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.text.primary,
          marginBottom: spacing.lg,
          lineHeight: '1.2'
        }}
      >
        {value}
      </div>

      <ProgressBar value={progress} max={max} variant={variant} animated />

      {subtitle && (
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.tertiary,
            marginTop: spacing.sm,
            fontWeight: typography.fontWeight.normal
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
