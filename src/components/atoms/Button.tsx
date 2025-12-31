import React from 'react';
import { TELEGRAM_THEME } from '../../styles/telegramTheme';

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
    gap: TELEGRAM_THEME.spacing.sm,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: TELEGRAM_THEME.typography.fontFamily.primary,
    fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
    transition: TELEGRAM_THEME.transitions.normal,
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
      padding: TELEGRAM_THEME.components.button.padding.small,
      fontSize: TELEGRAM_THEME.typography.fontSize.sm,
      borderRadius: TELEGRAM_THEME.radius.xl,
      minHeight: TELEGRAM_THEME.components.button.height.small,
      fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
    },
    md: {
      padding: TELEGRAM_THEME.components.button.padding.medium,
      fontSize: TELEGRAM_THEME.typography.fontSize.base,
      borderRadius: TELEGRAM_THEME.radius.xl,
      minHeight: TELEGRAM_THEME.components.button.height.medium,
      fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
    },
    lg: {
      padding: TELEGRAM_THEME.components.button.padding.large,
      fontSize: TELEGRAM_THEME.typography.fontSize.lg,
      borderRadius: TELEGRAM_THEME.radius.xl,
      minHeight: TELEGRAM_THEME.components.button.height.large,
      fontWeight: TELEGRAM_THEME.typography.fontWeight.semibold,
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: TELEGRAM_THEME.colors.accent.primary,
      color: TELEGRAM_THEME.colors.white,
      boxShadow: 'none',
      border: 'none',
    },
    secondary: {
      background: TELEGRAM_THEME.colors.accent.faded,
      color: TELEGRAM_THEME.colors.accent.primary,
      border: `1px solid ${TELEGRAM_THEME.colors.accent.border}`,
      boxShadow: 'none',
    },
    success: {
      background: TELEGRAM_THEME.colors.status.success,
      color: TELEGRAM_THEME.colors.white,
      boxShadow: 'none',
      border: 'none',
    },
    warning: {
      background: TELEGRAM_THEME.colors.status.warning,
      color: TELEGRAM_THEME.colors.black,
      boxShadow: 'none',
      border: 'none',
    },
    danger: {
      background: TELEGRAM_THEME.colors.status.error,
      color: TELEGRAM_THEME.colors.white,
      boxShadow: 'none',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: TELEGRAM_THEME.colors.text.primary,
      border: 'none',
      boxShadow: 'none',
    },
    link: {
      background: 'transparent',
      color: TELEGRAM_THEME.colors.text.link,
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
        background: TELEGRAM_THEME.colors.accent.hover,
      },
      secondary: {
        background: TELEGRAM_THEME.colors.accent.light,
        borderColor: TELEGRAM_THEME.colors.accent.primary,
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
        background: TELEGRAM_THEME.colors.background.hover,
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
