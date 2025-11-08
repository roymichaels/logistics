import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../styles/design-system';
import { getStatusColor, getStatusBackground } from '../../styles/design-system';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  status?: string;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  status,
  children,
  style,
  ...props
}: BadgeProps) {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.xs,
    },
    md: {
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.sm,
    },
    lg: {
      padding: `${spacing.sm} ${spacing.lg}`,
      fontSize: typography.fontSize.base,
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      background: colors.status.successFaded,
      color: colors.status.success,
      border: `1px solid ${colors.status.success}`,
    },
    warning: {
      background: colors.status.warningFaded,
      color: colors.status.warning,
      border: `1px solid ${colors.status.warning}`,
    },
    error: {
      background: colors.status.errorFaded,
      color: colors.status.error,
      border: `1px solid ${colors.status.error}`,
    },
    info: {
      background: colors.status.infoFaded,
      color: colors.status.info,
      border: `1px solid ${colors.status.info}`,
    },
    neutral: {
      background: colors.ui.card,
      color: colors.text.secondary,
      border: `1px solid ${colors.border.primary}`,
    },
  };

  const statusStyle = status
    ? {
        background: getStatusBackground(status),
        color: getStatusColor(status),
        border: `1px solid ${getStatusColor(status)}`,
      }
    : variantStyles[variant];

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.primary,
    borderRadius: borderRadius.md,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    ...sizeStyles[size],
    ...statusStyle,
    ...style,
  };

  return (
    <span style={badgeStyles} {...props}>
      {children}
    </span>
  );
}
