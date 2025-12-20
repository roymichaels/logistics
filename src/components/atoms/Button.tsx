import React from 'react';
import { colors, spacing, borderRadius, typography, transitions, shadows } from '../../design-system';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  style,
  className,
  ...props
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeight.bold,
    transition: `all ${transitions.normal}`,
    outline: 'none',
    opacity: disabled || loading ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    position: 'relative',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing[2]} ${spacing[5]}`,
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius['2xl'],
      minHeight: '36px',
      fontWeight: typography.fontWeight.bold,
    },
    md: {
      padding: `${spacing[3]} ${spacing[7]}`,
      fontSize: typography.fontSize.base,
      borderRadius: borderRadius['2xl'],
      minHeight: '44px',
      fontWeight: typography.fontWeight.bold,
    },
    lg: {
      padding: `${spacing[4]} ${spacing[8]}`,
      fontSize: typography.fontSize.lg,
      borderRadius: borderRadius['2xl'],
      minHeight: '48px',
      fontWeight: typography.fontWeight.bold,
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.brand.primary,
      color: colors.white,
      boxShadow: shadows.sm,
      border: 'none',
    },
    secondary: {
      background: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.border.primary}`,
      boxShadow: 'none',
    },
    success: {
      background: colors.status.success,
      color: colors.white,
      boxShadow: shadows.sm,
      border: 'none',
    },
    warning: {
      background: colors.status.warning,
      color: colors.text.inverse,
      boxShadow: shadows.sm,
      border: 'none',
    },
    danger: {
      background: colors.status.error,
      color: colors.white,
      boxShadow: shadows.sm,
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: colors.text.primary,
      border: 'none',
      boxShadow: 'none',
    },
    link: {
      background: 'transparent',
      color: colors.brand.primary,
      padding: '0',
      minHeight: 'auto',
      boxShadow: 'none',
      border: 'none',
    },
  };

  const [isHovered, setIsHovered] = React.useState(false);
  const [isPressed, setIsPressed] = React.useState(false);

  const getHoverStyles = (): React.CSSProperties => {
    if (disabled || loading) return {};

    const hoverMap: Record<string, React.CSSProperties> = {
      primary: {
        background: colors.brand.hover,
        boxShadow: shadows.md,
      },
      secondary: {
        background: colors.ui.cardHover,
        borderColor: colors.border.hover,
      },
      success: {
        filter: 'brightness(1.1)',
      },
      warning: {
        filter: 'brightness(1.1)',
      },
      danger: {
        filter: 'brightness(1.1)',
      },
      ghost: {
        background: colors.ui.cardHover,
      },
      link: {
        textDecoration: 'underline',
        opacity: 0.8,
      },
    };

    return hoverMap[variant] || {};
  };

  const getPressedStyles = (): React.CSSProperties => {
    if (disabled || loading || variant === 'link') return {};

    return {
      transform: 'scale(0.97)',
      filter: 'brightness(0.95)',
    };
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(isHovered ? getHoverStyles() : {}),
    ...(isPressed ? getPressedStyles() : {}),
    ...style,
  };

  return (
    <button
      {...props}
      className={className}
      disabled={disabled || loading}
      style={combinedStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      {loading && <Spinner size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {!loading && leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>}
      {children && <span>{children}</span>}
      {!loading && rightIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'spin 1s linear infinite',
        display: 'flex',
      }}
    >
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
        opacity="0.3"
      />
    </svg>
  );
}
