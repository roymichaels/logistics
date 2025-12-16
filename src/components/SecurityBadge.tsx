import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../styles/design-system';

interface SecurityBadgeProps {
  level: 'high' | 'medium' | 'low' | 'military' | 'enterprise' | 'standard';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function SecurityBadge({ level, size = 'md', showIcon = true }: SecurityBadgeProps) {
  const config = {
    high: {
      label: 'Military Grade',
      color: colors.security.high,
      background: colors.security.highFaded,
      Icon: ShieldCheck,
    },
    military: {
      label: 'Military Grade',
      color: colors.security.high,
      background: colors.security.highFaded,
      Icon: ShieldCheck,
    },
    medium: {
      label: 'Enterprise',
      color: colors.security.medium,
      background: colors.security.mediumFaded,
      Icon: Shield,
    },
    enterprise: {
      label: 'Enterprise',
      color: colors.security.medium,
      background: colors.security.mediumFaded,
      Icon: Shield,
    },
    low: {
      label: 'Standard',
      color: colors.security.low,
      background: colors.security.lowFaded,
      Icon: ShieldAlert,
    },
    standard: {
      label: 'Standard',
      color: colors.text.secondary,
      background: colors.background.tertiary,
      Icon: Shield,
    },
  };

  const { label, color, background, Icon } = config[level];

  const sizeConfig = {
    sm: {
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.fontSize.xs,
      iconSize: 14,
    },
    md: {
      padding: `${spacing.sm} ${spacing.md}`,
      fontSize: typography.fontSize.sm,
      iconSize: 16,
    },
    lg: {
      padding: `${spacing.md} ${spacing.lg}`,
      fontSize: typography.fontSize.base,
      iconSize: 20,
    },
  };

  const { padding, fontSize, iconSize } = sizeConfig[size];

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding,
    background,
    color,
    border: `1px solid ${color}`,
    borderRadius: borderRadius.full,
    fontSize,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={badgeStyle}>
      {showIcon && <Icon size={iconSize} strokeWidth={2.5} />}
      <span>{label}</span>
    </div>
  );
}
