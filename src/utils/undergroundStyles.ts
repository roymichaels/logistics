import { CSSProperties } from 'react';
import { undergroundTheme } from '../styles/undergroundTheme';

export function getGlassmorphicStyle(variant: 'light' | 'medium' | 'strong' = 'medium'): CSSProperties {
  return undergroundTheme.effects.glassmorphism[variant];
}

export function getGradientBackground(type: 'primary' | 'card' | 'accent' | 'success' | 'warning' | 'error' = 'primary'): string {
  return undergroundTheme.colors.gradient[type];
}

export function getAccentColor(context?: 'primary' | 'secondary' | 'tertiary'): string {
  if (!context) return undergroundTheme.colors.accent.primary;
  return undergroundTheme.colors.accent[context];
}

export function getGlowEffect(color: 'cyan' | 'success' | 'warning' | 'error' = 'cyan', size: 'normal' | 'large' = 'normal'): string {
  if (color === 'cyan' && size === 'large') {
    return undergroundTheme.shadows.glow.cyanLarge;
  }
  return undergroundTheme.shadows.glow[color];
}

export function getHoverTransform(type: 'lift' | 'scale' = 'lift'): string {
  return undergroundTheme.effects.hover[type];
}

export function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes('success') || normalized.includes('completed') || normalized.includes('delivered') || normalized.includes('active')) {
    return undergroundTheme.colors.status.success;
  }
  if (normalized.includes('pending') || normalized.includes('warning') || normalized.includes('processing')) {
    return undergroundTheme.colors.status.warning;
  }
  if (normalized.includes('error') || normalized.includes('cancelled') || normalized.includes('failed') || normalized.includes('rejected')) {
    return undergroundTheme.colors.status.error;
  }

  return undergroundTheme.colors.status.info;
}

export function getStatusGlow(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes('success') || normalized.includes('completed') || normalized.includes('delivered') || normalized.includes('active')) {
    return undergroundTheme.shadows.glow.success;
  }
  if (normalized.includes('pending') || normalized.includes('warning') || normalized.includes('processing')) {
    return undergroundTheme.shadows.glow.warning;
  }
  if (normalized.includes('error') || normalized.includes('cancelled') || normalized.includes('failed') || normalized.includes('rejected')) {
    return undergroundTheme.shadows.glow.error;
  }

  return undergroundTheme.shadows.glow.cyan;
}

export function getStatusBadgeStyle(status: string): CSSProperties {
  const color = getStatusColor(status);
  const bgColor = `${color}20`;
  const borderColor = `${color}50`;

  return {
    ...undergroundTheme.components.badge,
    background: bgColor,
    border: `1px solid ${borderColor}`,
    color: color,
  };
}

export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    business_owner: '#3b82f6',
    manager: '#10b981',
    warehouse: '#06b6d4',
    dispatcher: '#8b5cf6',
    sales: '#ec4899',
    customer_service: '#f59e0b',
    driver: '#f97316',
    customer: '#6366f1',
    guest: '#6b7280',
  };

  return roleColors[role.toLowerCase()] || undergroundTheme.colors.accent.primary;
}

export function createUndergroundCard(options?: {
  hover?: boolean;
  glow?: boolean;
  padding?: string;
}): CSSProperties {
  const baseStyle: CSSProperties = {
    ...undergroundTheme.components.card,
  };

  if (options?.padding) {
    baseStyle.padding = options.padding;
  }

  if (options?.hover) {
    return {
      ...baseStyle,
      cursor: 'pointer',
      '&:hover': undergroundTheme.components.cardHover,
    } as CSSProperties;
  }

  if (options?.glow) {
    baseStyle.boxShadow = undergroundTheme.shadows.glow.cyan;
  }

  return baseStyle;
}

export function createStatCardStyle(accentColor?: string): CSSProperties {
  return {
    ...undergroundTheme.components.card,
    display: 'flex',
    flexDirection: 'column',
    gap: undergroundTheme.spacing.md,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: accentColor || undergroundTheme.colors.gradient.accent,
    },
  } as CSSProperties;
}

export function createGlowingIconStyle(color?: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    borderRadius: undergroundTheme.borderRadius.lg,
    background: `${color || undergroundTheme.colors.accent.primary}20`,
    color: color || undergroundTheme.colors.accent.primary,
    boxShadow: `0 0 20px ${color || undergroundTheme.colors.accent.primary}40`,
  };
}

export function createAnimatedButtonStyle(variant: 'primary' | 'secondary' | 'ghost' = 'primary'): CSSProperties {
  const baseStyle = undergroundTheme.components.button[variant];

  return {
    ...baseStyle,
    transition: undergroundTheme.transitions.normal,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: variant === 'primary' ? undergroundTheme.shadows.glow.cyanLarge : undergroundTheme.shadows.md,
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  } as CSSProperties;
}

export function createInputWithGlowStyle(hasError?: boolean): CSSProperties {
  return {
    ...undergroundTheme.components.input,
    '&:focus': {
      borderColor: hasError ? undergroundTheme.colors.status.error : undergroundTheme.colors.accent.primary,
      boxShadow: hasError ? undergroundTheme.shadows.glow.error : undergroundTheme.shadows.glow.cyan,
      background: undergroundTheme.colors.glassmorphism.medium,
    },
  } as CSSProperties;
}

export function createPageContainerStyle(): CSSProperties {
  return undergroundTheme.components.page;
}

export function createSectionStyle(): CSSProperties {
  return undergroundTheme.components.section;
}

export const undergroundAnimations = {
  fadeIn: {
    animation: 'fadeIn 300ms ease-in-out',
    '@keyframes fadeIn': {
      from: { opacity: 0, transform: 'translateY(10px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
  },
  slideIn: {
    animation: 'slideIn 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    '@keyframes slideIn': {
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
    },
  },
  pulse: {
    animation: 'pulse 2s ease-in-out infinite',
    '@keyframes pulse': {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.6 },
    },
  },
};
