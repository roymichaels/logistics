import React from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
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
  const normalizedSize = size === 'small' ? 'sm' : size === 'medium' ? 'md' : size === 'large' ? 'lg' : size;
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: undergroundTheme.spacing.sm,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: undergroundTheme.typography.fontFamily.primary,
    fontWeight: undergroundTheme.typography.fontWeight.semibold,
    transition: undergroundTheme.transitions.normal,
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
      padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.lg}`,
      fontSize: undergroundTheme.typography.fontSize.sm,
      borderRadius: undergroundTheme.borderRadius.lg,
      minHeight: '32px',
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
    },
    md: {
      padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.xl}`,
      fontSize: undergroundTheme.typography.fontSize.base,
      borderRadius: undergroundTheme.borderRadius.lg,
      minHeight: '40px',
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
    },
    lg: {
      padding: `${undergroundTheme.spacing.lg} ${undergroundTheme.spacing['2xl']}`,
      fontSize: undergroundTheme.typography.fontSize.lg,
      borderRadius: undergroundTheme.borderRadius.xl,
      minHeight: '48px',
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: undergroundTheme.colors.gradient.accent,
      color: undergroundTheme.colors.text.primary,
      boxShadow: undergroundTheme.shadows.glow.cyan,
      border: 'none',
    },
    secondary: {
      background: undergroundTheme.colors.glassmorphism.light,
      color: undergroundTheme.colors.accent.primary,
      border: `2px solid ${undergroundTheme.colors.accent.primary}`,
      boxShadow: 'none',
    },
    success: {
      background: undergroundTheme.colors.gradient.success,
      color: undergroundTheme.colors.text.primary,
      boxShadow: undergroundTheme.shadows.glow.success,
      border: 'none',
    },
    warning: {
      background: undergroundTheme.colors.gradient.warning,
      color: undergroundTheme.colors.text.primary,
      boxShadow: undergroundTheme.shadows.glow.warning,
      border: 'none',
    },
    danger: {
      background: undergroundTheme.colors.gradient.error,
      color: undergroundTheme.colors.text.primary,
      boxShadow: undergroundTheme.shadows.glow.error,
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: undergroundTheme.colors.text.secondary,
      border: 'none',
      boxShadow: 'none',
    },
    link: {
      background: 'transparent',
      color: undergroundTheme.colors.accent.primary,
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
        filter: 'brightness(1.1)',
        boxShadow: undergroundTheme.shadows.glow.cyanLarge,
      },
      secondary: {
        background: undergroundTheme.colors.glassmorphism.medium,
        borderColor: undergroundTheme.colors.accent.secondary,
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
        background: undergroundTheme.colors.glassmorphism.light,
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
    ...sizeStyles[normalizedSize],
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
      {loading && <Spinner size={normalizedSize === 'sm' ? 14 : normalizedSize === 'lg' ? 20 : 16} />}
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
