import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../styles/design-system';

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
  ...props
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeight.semibold,
    transition: transitions.normal,
    outline: 'none',
    opacity: disabled || loading ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: `${spacing.sm} ${spacing.lg}`,
      fontSize: typography.fontSize.sm,
      borderRadius: borderRadius.md,
      minHeight: '32px',
    },
    md: {
      padding: `${spacing.md} ${spacing.xl}`,
      fontSize: typography.fontSize.base,
      borderRadius: borderRadius.lg,
      minHeight: '40px',
    },
    lg: {
      padding: `${spacing.lg} ${spacing['2xl']}`,
      fontSize: typography.fontSize.lg,
      borderRadius: borderRadius.xl,
      minHeight: '48px',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: colors.brand.primary,
      color: colors.text.inverse,
      boxShadow: colors.brand.primary === '#00D9FF' ? '0 0 16px rgba(0, 217, 255, 0.3)' : 'none',
    },
    secondary: {
      background: 'transparent',
      color: colors.brand.primary,
      border: `2px solid ${colors.brand.primary}`,
    },
    success: {
      background: colors.status.success,
      color: colors.white,
    },
    warning: {
      background: colors.status.warning,
      color: colors.text.inverse,
    },
    danger: {
      background: colors.status.error,
      color: colors.white,
    },
    ghost: {
      background: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.border.primary}`,
    },
    link: {
      background: 'transparent',
      color: colors.brand.primary,
      padding: '0',
      minHeight: 'auto',
    },
  };

  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: { background: colors.brand.primaryHover },
    secondary: { background: colors.brand.primaryFaded },
    success: { filter: 'brightness(1.1)' },
    warning: { filter: 'brightness(1.1)' },
    danger: { filter: 'brightness(1.1)' },
    ghost: { background: colors.ui.cardHover },
    link: { textDecoration: 'underline' },
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...(isHovered && !disabled && !loading ? hoverStyles[variant] : {}),
    ...style,
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={combinedStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {loading && <Spinner size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {!loading && leftIcon && <span>{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span>{rightIcon}</span>}
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
      style={{ animation: 'spin 1s linear infinite' }}
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
