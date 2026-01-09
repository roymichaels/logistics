import React, { ReactNode } from 'react';
import { undergroundTheme } from '../../styles/undergroundTheme';

interface UndergroundButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function UndergroundButton({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  type = 'button',
  fullWidth = false,
  icon,
  className,
  style,
}: UndergroundButtonProps) {
  const baseStyle: React.CSSProperties = {
    ...undergroundTheme.components.button[variant],
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: undergroundTheme.spacing.sm,
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      if (variant === 'primary') {
        e.currentTarget.style.boxShadow = undergroundTheme.shadows.glow.cyanLarge;
      } else {
        e.currentTarget.style.background = undergroundTheme.colors.glassmorphism.medium;
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      e.currentTarget.style.transform = 'translateY(0)';
      if (variant === 'primary') {
        e.currentTarget.style.boxShadow = undergroundTheme.shadows.glow.cyan;
      } else {
        e.currentTarget.style.background = variant === 'secondary' ? undergroundTheme.colors.glassmorphism.light : 'transparent';
      }
    }
  };

  return (
    <button
      type={type}
      className={className}
      style={baseStyle}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
}
