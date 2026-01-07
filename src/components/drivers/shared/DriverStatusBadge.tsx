import React from 'react';
import { tokens } from '../../../styles/tokens';

export type DriverStatusType = 'online' | 'offline' | 'busy' | 'available' | 'on_break' | 'assigned' | 'accepted' | 'picked_up' | 'delivered';

interface DriverStatusBadgeProps {
  status: DriverStatusType;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function DriverStatusBadge({ status, showIcon = true, size = 'medium' }: DriverStatusBadgeProps) {
  const config = getStatusConfig(status);

  const sizeStyles = {
    small: { padding: '4px 10px', fontSize: '11px' },
    medium: { padding: '6px 14px', fontSize: '13px' },
    large: { padding: '8px 16px', fontSize: '14px' }
  };

  return (
    <div style={{
      ...sizeStyles[size],
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: `${config.color}20`,
      border: `1px solid ${config.color}50`,
      borderRadius: '20px',
      fontWeight: '600',
      color: config.color
    }}>
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </div>
  );
}

function getStatusConfig(status: DriverStatusType) {
  switch (status) {
    case 'online':
    case 'available':
      return { color: tokens.colors.status.success, label: 'מחובר', icon: '🟢' };
    case 'busy':
      return { color: tokens.colors.status.info, label: 'עסוק', icon: '🔵' };
    case 'offline':
      return { color: tokens.colors.subtle, label: 'לא מחובר', icon: '⚫' };
    case 'on_break':
      return { color: tokens.colors.status.warning, label: 'הפסקה', icon: '🟡' };
    case 'assigned':
      return { color: tokens.colors.brand.primary, label: 'משימה חדשה', icon: '📋' };
    case 'accepted':
      return { color: tokens.colors.status.warning, label: 'התקבל', icon: '🚗' };
    case 'picked_up':
      return { color: tokens.colors.status.info, label: 'נאסף', icon: '📦' };
    case 'delivered':
      return { color: tokens.colors.status.success, label: 'הושלם', icon: '✅' };
    default:
      return { color: tokens.colors.subtle, label: status, icon: '❓' };
  }
}
