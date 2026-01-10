import React, { useState } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundChipProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onRemove?: () => void;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export const UndergroundChip: React.FC<UndergroundChipProps> = ({
  label,
  variant = 'default',
  onRemove,
  onClick,
  icon,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const variantColors = {
    default: {
      bg: undergroundTheme.colors.background.surface,
      border: undergroundTheme.colors.glassmorphism.border,
      text: undergroundTheme.colors.text.primary,
    },
    success: {
      bg: 'rgba(34, 211, 238, 0.1)',
      border: undergroundTheme.colors.status.success,
      text: undergroundTheme.colors.status.success,
    },
    warning: {
      bg: 'rgba(251, 191, 36, 0.1)',
      border: undergroundTheme.colors.status.warning,
      text: undergroundTheme.colors.status.warning,
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: undergroundTheme.colors.status.error,
      text: undergroundTheme.colors.status.error,
    },
    info: {
      bg: 'rgba(0, 217, 255, 0.1)',
      border: undergroundTheme.colors.accent.primary,
      text: undergroundTheme.colors.accent.primary,
    },
  };

  const colors = variantColors[variant];

  const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: undergroundTheme.spacing.xs,
    padding: `${undergroundTheme.spacing.xs} ${undergroundTheme.spacing.sm}`,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: undergroundTheme.borderRadius.full,
    color: colors.text,
    fontSize: undergroundTheme.typography.fontSize.xs,
    fontWeight: undergroundTheme.typography.fontWeight.medium,
    cursor: onClick ? 'pointer' : 'default',
    transition: `all ${undergroundTheme.transitions.fast}`,
    transform: isHovered && onClick ? 'translateY(-1px)' : 'translateY(0)',
    userSelect: 'none',
  };

  const removeButtonStyle: React.CSSProperties = {
    marginLeft: undergroundTheme.spacing.xs,
    width: '14px',
    height: '14px',
    borderRadius: undergroundTheme.borderRadius.full,
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '10px',
    transition: `all ${undergroundTheme.transitions.fast}`,
  };

  return (
    <div
      style={chipStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          style={removeButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
