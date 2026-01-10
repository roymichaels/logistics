import React from 'react';
import { undergroundTheme } from '../../../styles/undergroundTheme';

export type DriverStatusType = 'online' | 'offline' | 'busy' | 'available' | 'on_break' | 'assigned' | 'accepted' | 'picked_up' | 'delivered';

interface DriverStatusBadgeProps {
  status: DriverStatusType;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function DriverStatusBadge({ status, showIcon = true, size = 'medium' }: DriverStatusBadgeProps) {
  const config = getStatusConfig(status);

  const sizeStyles = {
    small: {
      padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
      fontSize: undergroundTheme.typography.fontSize.xs
    },
    medium: {
      padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}`,
      fontSize: undergroundTheme.typography.fontSize.sm
    },
    large: {
      padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
      fontSize: undergroundTheme.typography.fontSize.base
    }
  };

  return (
    <div style={{
      ...sizeStyles[size],
      display: 'inline-flex',
      alignItems: 'center',
      gap: undergroundTheme.spacing.xs,
      background: `${config.color}15`,
      border: `1px solid ${config.color}60`,
      borderRadius: undergroundTheme.borderRadius.full,
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
      color: config.color,
      boxShadow: `0 0 10px ${config.color}20`,
      transition: 'all 0.3s ease'
    }}>
      {showIcon && <span style={{
        filter: `drop-shadow(0 0 4px ${config.color}60)`
      }}>{config.icon}</span>}
      {config.label}
    </div>
  );
}

function getStatusConfig(status: DriverStatusType) {
  switch (status) {
    case 'online':
    case 'available':
      return {
        color: undergroundTheme.colors.status.success,
        label: 'מחובר',
        icon: '🟢'
      };
    case 'busy':
      return {
        color: undergroundTheme.colors.status.info,
        label: 'עסוק',
        icon: '🔵'
      };
    case 'offline':
      return {
        color: undergroundTheme.colors.text.tertiary,
        label: 'לא מחובר',
        icon: '⚫'
      };
    case 'on_break':
      return {
        color: undergroundTheme.colors.status.warning,
        label: 'הפסקה',
        icon: '🟡'
      };
    case 'assigned':
      return {
        color: undergroundTheme.colors.primary.cyan,
        label: 'משימה חדשה',
        icon: '📋'
      };
    case 'accepted':
      return {
        color: undergroundTheme.colors.status.warning,
        label: 'התקבל',
        icon: '🚗'
      };
    case 'picked_up':
      return {
        color: undergroundTheme.colors.status.info,
        label: 'נאסף',
        icon: '📦'
      };
    case 'delivered':
      return {
        color: undergroundTheme.colors.status.success,
        label: 'הושלם',
        icon: '✅'
      };
    default:
      return {
        color: undergroundTheme.colors.text.tertiary,
        label: status,
        icon: '❓'
      };
  }
}
