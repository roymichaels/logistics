import React from 'react';
import { colors, spacing, borderRadius, typography } from '../../styles/design-system';

export type UserRole =
  | 'business_owner'
  | 'manager'
  | 'warehouse'
  | 'dispatcher'
  | 'sales'
  | 'customer_service'
  | 'driver'
  | 'customer'
  | 'guest';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const roleConfig: Record<UserRole, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  business_owner: {
    label: 'Business Owner',
    icon: '👑',
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    description: 'Owns and manages one or more businesses on the platform',
  },
  manager: {
    label: 'Manager',
    icon: '⭐',
    color: '#7C3AED',
    bgColor: 'rgba(124, 58, 237, 0.1)',
    description: 'Manages business operations and team members',
  },
  warehouse: {
    label: 'Warehouse Staff',
    icon: '📦',
    color: '#0891B2',
    bgColor: 'rgba(8, 145, 178, 0.1)',
    description: 'Handles inventory and warehouse operations',
  },
  dispatcher: {
    label: 'Dispatcher',
    icon: '📍',
    color: '#DC2626',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    description: 'Coordinates and manages deliveries',
  },
  sales: {
    label: 'Sales',
    icon: '💼',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.1)',
    description: 'Handles sales and customer relationships',
  },
  customer_service: {
    label: 'Support',
    icon: '🎧',
    color: '#2563EB',
    bgColor: 'rgba(37, 99, 235, 0.1)',
    description: 'Provides customer support and assistance',
  },
  driver: {
    label: 'Driver',
    icon: '🚗',
    color: '#0284C7',
    bgColor: 'rgba(2, 132, 199, 0.1)',
    description: 'Delivers orders to customers',
  },
  customer: {
    label: 'Customer',
    icon: '🛍️',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.1)',
    description: 'Shops and orders from businesses',
  },
  guest: {
    label: 'Guest',
    icon: '👤',
    color: '#9CA3AF',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    description: 'Browsing the platform',
  },
};

export function RoleBadge({
  role,
  size = 'medium',
  showIcon = true,
  showLabel = true,
  className = '',
  style = {},
}: RoleBadgeProps) {
  const config = roleConfig[role] || roleConfig.guest;

  const sizeStyles = {
    small: {
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.xs,
      iconSize: '12px',
      gap: spacing.xs,
    },
    medium: {
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.sm,
      iconSize: '14px',
      gap: spacing.sm,
    },
    large: {
      padding: `${spacing.md} ${spacing.lg}`,
      fontSize: typography.fontSize.base,
      iconSize: '16px',
      gap: spacing.md,
    },
  };

  const currentSize = sizeStyles[size];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: currentSize.gap,
    padding: currentSize.padding,
    backgroundColor: config.bgColor,
    color: config.color,
    borderRadius: borderRadius.full,
    fontSize: currentSize.fontSize,
    fontWeight: typography.fontWeight.semibold,
    border: `1px solid ${config.color}20`,
    whiteSpace: 'nowrap',
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: currentSize.iconSize,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <span
      className={`role-badge role-badge-${role} ${className}`}
      style={badgeStyle}
      title={config.description}
    >
      {showIcon && (
        <span style={iconStyle} aria-label={config.label}>
          {config.icon}
        </span>
      )}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface VerificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

export function VerificationBadge({
  size = 'medium',
  className = '',
  style = {},
}: VerificationBadgeProps) {
  const sizeMap = {
    small: '14px',
    medium: '18px',
    large: '22px',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizeMap[size],
    height: sizeMap[size],
    backgroundColor: '#3B82F6',
    borderRadius: borderRadius.full,
    color: '#FFFFFF',
    fontSize: size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px',
    fontWeight: typography.fontWeight.bold,
    border: '2px solid #FFFFFF',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    ...style,
  };

  return (
    <span
      className={`verification-badge ${className}`}
      style={badgeStyle}
      title="Verified User"
      aria-label="Verified"
    >
      ✓
    </span>
  );
}
