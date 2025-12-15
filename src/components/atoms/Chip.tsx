import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../design-system';

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  clickable?: boolean;
  onRemove?: () => void;
  selected?: boolean;
}

export function Chip({
  variant = 'default',
  size = 'md',
  clickable = false,
  onRemove,
  selected = false,
  children,
  style,
  onClick,
  ...props
}: ChipProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borderRadius.full,
    transition: `all ${transitions.normal}`,
    cursor: clickable || onClick ? 'pointer' : 'default',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing[1]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs,
      height: '24px',
    },
    md: {
      padding: `${spacing[2]} ${spacing[3]}`,
      fontSize: typography.fontSize.sm,
      height: '32px',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: selected ? colors.brand.primary : colors.ui.cardHover,
      color: selected ? colors.white : colors.text.primary,
      border: `1px solid ${selected ? colors.brand.primary : colors.border.primary}`,
    },
    primary: {
      background: colors.brand.primary,
      color: colors.white,
      border: `1px solid ${colors.brand.primary}`,
    },
    success: {
      background: colors.status.success,
      color: colors.white,
      border: `1px solid ${colors.status.success}`,
    },
    warning: {
      background: colors.status.warning,
      color: colors.text.inverse,
      border: `1px solid ${colors.status.warning}`,
    },
    danger: {
      background: colors.status.error,
      color: colors.white,
      border: `1px solid ${colors.status.error}`,
    },
  };

  const hoverStyles: React.CSSProperties = isHovered && (clickable || onClick)
    ? {
        filter: 'brightness(0.95)',
        transform: 'scale(1.02)',
      }
    : {};

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...hoverStyles,
    ...style,
  };

  return (
    <div
      style={combinedStyles}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'inherit',
            marginLeft: spacing[1],
          }}
          aria-label="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
