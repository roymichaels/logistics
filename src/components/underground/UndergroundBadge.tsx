import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';
import { getStatusColor, getStatusBadgeStyle } from '../../utils/undergroundStyles';

interface UndergroundBadgeProps {
  children: ReactNode;
  variant?: 'status' | 'role' | 'metric';
  status?: string;
  color?: string;
  icon?: ReactNode;
  glow?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function UndergroundBadge({
  children,
  variant = 'metric',
  status,
  color,
  icon,
  glow = false,
  className,
  style,
}: UndergroundBadgeProps) {
  let badgeStyle: React.CSSProperties = {
    ...undergroundTheme.components.badge,
    ...style,
  };

  if (variant === 'status' && status) {
    badgeStyle = {
      ...badgeStyle,
      ...getStatusBadgeStyle(status),
    };
    if (glow) {
      badgeStyle.boxShadow = `0 0 12px ${getStatusColor(status)}60`;
    }
  } else if (color) {
    badgeStyle = {
      ...badgeStyle,
      background: `${color}20`,
      border: `1px solid ${color}50`,
      color: color,
    };
    if (glow) {
      badgeStyle.boxShadow = `0 0 12px ${color}60`;
    }
  } else {
    badgeStyle = {
      ...badgeStyle,
      background: undergroundTheme.colors.glassmorphism.light,
      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
      color: undergroundTheme.colors.text.secondary,
    };
  }

  return (
    <span className={className} style={badgeStyle}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
}
