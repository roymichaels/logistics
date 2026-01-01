import React from 'react';
import { tokens } from '../../theme/tokens';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'active'
  | 'inactive'
  | 'completed'
  | 'cancelled'
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'delivered'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  variant: StatusVariant;
  size?: StatusSize;
  label?: string;
  pulsing?: boolean;
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<StatusVariant, { bg: string; color: string; border: string }> = {
  success: {
    bg: tokens.colors.semantic.success + '15',
    color: tokens.colors.semantic.success,
    border: tokens.colors.semantic.success + '40',
  },
  warning: {
    bg: tokens.colors.semantic.warning + '15',
    color: tokens.colors.semantic.warning,
    border: tokens.colors.semantic.warning + '40',
  },
  error: {
    bg: tokens.colors.semantic.error + '15',
    color: tokens.colors.semantic.error,
    border: tokens.colors.semantic.error + '40',
  },
  info: {
    bg: tokens.colors.semantic.info + '15',
    color: tokens.colors.semantic.info,
    border: tokens.colors.semantic.info + '40',
  },
  pending: {
    bg: tokens.colors.neutral[100],
    color: tokens.colors.neutral[700],
    border: tokens.colors.neutral[300],
  },
  active: {
    bg: tokens.colors.semantic.success + '15',
    color: tokens.colors.semantic.success,
    border: tokens.colors.semantic.success + '40',
  },
  inactive: {
    bg: tokens.colors.neutral[100],
    color: tokens.colors.neutral[500],
    border: tokens.colors.neutral[300],
  },
  completed: {
    bg: tokens.colors.semantic.success + '15',
    color: tokens.colors.semantic.success,
    border: tokens.colors.semantic.success + '40',
  },
  cancelled: {
    bg: tokens.colors.neutral[100],
    color: tokens.colors.neutral[600],
    border: tokens.colors.neutral[300],
  },
  new: {
    bg: tokens.colors.primary[50],
    color: tokens.colors.primary[700],
    border: tokens.colors.primary[200],
  },
  assigned: {
    bg: '#0ea5e9' + '15',
    color: '#0ea5e9',
    border: '#0ea5e9' + '40',
  },
  in_progress: {
    bg: tokens.colors.semantic.warning + '15',
    color: tokens.colors.semantic.warning,
    border: tokens.colors.semantic.warning + '40',
  },
  delivered: {
    bg: tokens.colors.semantic.success + '15',
    color: tokens.colors.semantic.success,
    border: tokens.colors.semantic.success + '40',
  },
  qualified: {
    bg: '#3b82f6' + '15',
    color: '#3b82f6',
    border: '#3b82f6' + '40',
  },
  proposal: {
    bg: '#f59e0b' + '15',
    color: '#f59e0b',
    border: '#f59e0b' + '40',
  },
  negotiation: {
    bg: '#0ea5e9' + '15',
    color: '#0ea5e9',
    border: '#0ea5e9' + '40',
  },
  won: {
    bg: tokens.colors.semantic.success + '15',
    color: tokens.colors.semantic.success,
    border: tokens.colors.semantic.success + '40',
  },
  lost: {
    bg: tokens.colors.semantic.error + '15',
    color: tokens.colors.semantic.error,
    border: tokens.colors.semantic.error + '40',
  },
};

const sizeStyles: Record<StatusSize, { padding: string; fontSize: string; borderRadius: string }> = {
  sm: {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '4px',
  },
  md: {
    padding: '4px 12px',
    fontSize: '13px',
    borderRadius: '6px',
  },
  lg: {
    padding: '6px 16px',
    fontSize: '14px',
    borderRadius: '8px',
  },
};

export function StatusBadge({
  variant,
  size = 'md',
  label,
  pulsing = false,
  icon,
  className,
  style,
}: StatusBadgeProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const displayLabel = label || variant.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: variantStyle.bg,
        color: variantStyle.color,
        border: `1px solid ${variantStyle.border}`,
        fontWeight: 600,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
        position: 'relative',
        ...sizeStyle,
        ...style,
      }}
    >
      {pulsing && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: variantStyle.color,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      )}
      {icon && <span style={{ fontSize: sizeStyle.fontSize }}>{icon}</span>}
      {displayLabel}
    </span>
  );
}
