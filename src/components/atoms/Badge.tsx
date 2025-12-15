import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../design-system';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  children,
  style,
  ...props
}: BadgeProps) {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing[1]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs,
    },
    md: {
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: typography.fontSize.sm,
    },
    lg: {
      padding: `${spacing[2]} ${spacing[4]}`,
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
    ...variantStyles[variant],
    ...style,
  };

  return (
    <span style={badgeStyles} {...props}>
      {children}
    </span>
  );
}
