import React from 'react';
import { colors, spacing, typography, transitions } from '../../styles/design-system';

export interface NavigationTabProps {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
  badge?: number;
}

export function NavigationTab({
  id,
  label,
  icon,
  active = false,
  onClick,
  badge,
}: NavigationTabProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const tabStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: transitions.normal,
    position: 'relative',
    minWidth: '60px',
    flex: 1,
  };

  const iconStyles: React.CSSProperties = {
    fontSize: '24px',
    filter: active
      ? `drop-shadow(0 0 8px ${colors.brand.primary})`
      : isHovered
      ? 'brightness(1.2)'
      : 'none',
    transition: transitions.normal,
  };

  const labelStyles: React.CSSProperties = {
    fontSize: typography.fontSize.xs,
    fontWeight: active ? typography.fontWeight.semibold : typography.fontWeight.normal,
    color: active ? colors.brand.primary : colors.text.secondary,
    transition: transitions.normal,
    whiteSpace: 'nowrap',
  };

  const badgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: spacing.xs,
    right: '20%',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    background: colors.status.error,
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `0 ${spacing.xs}`,
  };

  const indicatorStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '40px',
    height: '3px',
    background: colors.brand.primary,
    borderRadius: '0 0 2px 2px',
    opacity: active ? 1 : 0,
    transition: transitions.normal,
  };

  return (
    <button
      style={tabStyles}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <div style={indicatorStyles} />
      <span style={iconStyles}>{icon}</span>
      <span style={labelStyles}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={badgeStyles}>{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  );
}
