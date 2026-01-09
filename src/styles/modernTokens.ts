/**
 * MODERN UNIFIED DESIGN TOKENS
 * Single source of truth for all design values
 * Modern, vibrant color palette with proper hierarchy
 */

export const modernTokens = {
  colors: {
    // Background hierarchy - darker, more modern
    background: {
      base: '#0a0e14',           // Darkest - page background
      surface: '#12161f',        // Cards and panels
      elevated: '#1a1f2e',       // Modals, popovers
      hover: '#1f2533',          // Hover states
      overlay: 'rgba(0, 0, 0, 0.6)', // Modal overlays
    },

    // Text colors - better contrast
    text: {
      primary: '#ffffff',        // Pure white for main text
      secondary: '#94a3b8',      // Lighter gray for secondary
      tertiary: '#64748b',       // Medium gray for tertiary
      muted: '#475569',          // Dark gray for muted text
      inverse: '#0a0e14',        // Text on light backgrounds
    },

    // Brand colors - vibrant and modern
    brand: {
      primary: '#00d4ff',        // Bright cyan
      primaryHover: '#00b8e6',   // Hover state
      primaryPressed: '#009fcc', // Pressed state
      secondary: '#6366f1',      // Indigo
      tertiary: '#8b5cf6',       // Purple
    },

    // Status colors - bright and clear
    status: {
      success: '#00d68f',        // Bright green
      successSubtle: 'rgba(0, 214, 143, 0.15)',
      warning: '#ffad1f',        // Vibrant orange
      warningSubtle: 'rgba(255, 173, 31, 0.15)',
      error: '#ff4d6d',          // Bright red
      errorSubtle: 'rgba(255, 77, 109, 0.15)',
      info: '#00d4ff',           // Cyan
      infoSubtle: 'rgba(0, 212, 255, 0.15)',
    },

    // Border colors
    border: {
      default: 'rgba(255, 255, 255, 0.1)',
      subtle: 'rgba(255, 255, 255, 0.05)',
      strong: 'rgba(255, 255, 255, 0.2)',
      hover: 'rgba(0, 212, 255, 0.4)',
      focus: '#00d4ff',
    },

    // Interactive states
    interactive: {
      primary: '#00d4ff',
      hover: 'rgba(0, 212, 255, 0.1)',
      pressed: 'rgba(0, 212, 255, 0.2)',
    },
  },

  // Gradients - modern and vibrant
  gradients: {
    primary: 'linear-gradient(135deg, #00d4ff 0%, #0099ff 100%)',
    secondary: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    success: 'linear-gradient(135deg, #00d68f 0%, #00ba7c 100%)',
    warning: 'linear-gradient(135deg, #ffad1f 0%, #ff9000 100%)',
    error: 'linear-gradient(135deg, #ff4d6d 0%, #c9184a 100%)',
    card: 'linear-gradient(145deg, #1a1f2e 0%, #12161f 100%)',
    cardHover: 'linear-gradient(145deg, #1f2533 0%, #1a1f2e 100%)',
    glass: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
  },

  // Shadows - depth and elevation
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 8px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.6)',
    xxl: '0 20px 40px rgba(0, 0, 0, 0.7)',
  },

  // Glows - modern accent lighting
  glows: {
    primary: '0 0 20px rgba(0, 212, 255, 0.3)',
    primaryStrong: '0 0 30px rgba(0, 212, 255, 0.5)',
    success: '0 0 20px rgba(0, 214, 143, 0.3)',
    warning: '0 0 20px rgba(255, 173, 31, 0.3)',
    error: '0 0 20px rgba(255, 77, 109, 0.3)',
    subtle: '0 0 10px rgba(255, 255, 255, 0.1)',
  },

  // Border radius - modern rounded corners
  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    full: '9999px',
  },

  // Spacing - 4px grid system
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '64px',
  },

  // Typography - modern scale
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '15px',
      lg: '17px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
      '4xl': '32px',
      '5xl': '48px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.6,
    },
  },

  // Transitions - smooth animations
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
} as const;

// Pre-styled components
export const modernStyles = {
  card: {
    base: {
      background: modernTokens.gradients.card,
      border: `1px solid ${modernTokens.colors.border.default}`,
      borderRadius: modernTokens.radius.lg,
      padding: modernTokens.spacing['2xl'],
      boxShadow: modernTokens.shadows.md,
      transition: `all ${modernTokens.transitions.normal}`,
      backdropFilter: 'blur(20px)',
    },
    hover: {
      background: modernTokens.gradients.cardHover,
      border: `1px solid ${modernTokens.colors.border.hover}`,
      boxShadow: modernTokens.shadows.lg,
      transform: 'translateY(-2px)',
    },
  },

  button: {
    primary: {
      background: modernTokens.gradients.primary,
      color: modernTokens.colors.text.primary,
      border: 'none',
      borderRadius: modernTokens.radius.md,
      padding: `${modernTokens.spacing.md} ${modernTokens.spacing['2xl']}`,
      fontSize: modernTokens.typography.fontSize.base,
      fontWeight: modernTokens.typography.fontWeight.semibold,
      boxShadow: modernTokens.glows.primary,
      transition: `all ${modernTokens.transitions.normal}`,
      cursor: 'pointer',
    },
    secondary: {
      background: 'transparent',
      color: modernTokens.colors.brand.primary,
      border: `2px solid ${modernTokens.colors.brand.primary}`,
      borderRadius: modernTokens.radius.md,
      padding: `${modernTokens.spacing.md} ${modernTokens.spacing['2xl']}`,
      fontSize: modernTokens.typography.fontSize.base,
      fontWeight: modernTokens.typography.fontWeight.semibold,
      transition: `all ${modernTokens.transitions.normal}`,
      cursor: 'pointer',
    },
    ghost: {
      background: 'transparent',
      color: modernTokens.colors.text.secondary,
      border: 'none',
      borderRadius: modernTokens.radius.md,
      padding: `${modernTokens.spacing.md} ${modernTokens.spacing['2xl']}`,
      fontSize: modernTokens.typography.fontSize.base,
      fontWeight: modernTokens.typography.fontWeight.medium,
      transition: `all ${modernTokens.transitions.normal}`,
      cursor: 'pointer',
    },
  },

  statCard: {
    base: {
      position: 'relative' as const,
      overflow: 'hidden' as const,
    },
    gradient: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.1,
      pointerEvents: 'none' as const,
    },
  },

  input: {
    base: {
      width: '100%',
      background: modernTokens.colors.background.surface,
      border: `1px solid ${modernTokens.colors.border.default}`,
      borderRadius: modernTokens.radius.md,
      padding: `${modernTokens.spacing.md} ${modernTokens.spacing.lg}`,
      color: modernTokens.colors.text.primary,
      fontSize: modernTokens.typography.fontSize.base,
      transition: `all ${modernTokens.transitions.fast}`,
      outline: 'none',
    },
    focus: {
      border: `1px solid ${modernTokens.colors.border.focus}`,
      boxShadow: `0 0 0 3px ${modernTokens.colors.status.infoSubtle}`,
    },
  },

  badge: {
    success: {
      background: modernTokens.colors.status.successSubtle,
      border: `1px solid ${modernTokens.colors.status.success}`,
      color: modernTokens.colors.status.success,
      padding: `${modernTokens.spacing.xs} ${modernTokens.spacing.md}`,
      borderRadius: modernTokens.radius.sm,
      fontSize: modernTokens.typography.fontSize.xs,
      fontWeight: modernTokens.typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    warning: {
      background: modernTokens.colors.status.warningSubtle,
      border: `1px solid ${modernTokens.colors.status.warning}`,
      color: modernTokens.colors.status.warning,
      padding: `${modernTokens.spacing.xs} ${modernTokens.spacing.md}`,
      borderRadius: modernTokens.radius.sm,
      fontSize: modernTokens.typography.fontSize.xs,
      fontWeight: modernTokens.typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    error: {
      background: modernTokens.colors.status.errorSubtle,
      border: `1px solid ${modernTokens.colors.status.error}`,
      color: modernTokens.colors.status.error,
      padding: `${modernTokens.spacing.xs} ${modernTokens.spacing.md}`,
      borderRadius: modernTokens.radius.sm,
      fontSize: modernTokens.typography.fontSize.xs,
      fontWeight: modernTokens.typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    info: {
      background: modernTokens.colors.status.infoSubtle,
      border: `1px solid ${modernTokens.colors.status.info}`,
      color: modernTokens.colors.status.info,
      padding: `${modernTokens.spacing.xs} ${modernTokens.spacing.md}`,
      borderRadius: modernTokens.radius.sm,
      fontSize: modernTokens.typography.fontSize.xs,
      fontWeight: modernTokens.typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
  },
} as const;

// Utility functions
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    pending: modernTokens.colors.status.warning,
    active: modernTokens.colors.status.info,
    completed: modernTokens.colors.status.success,
    delivered: modernTokens.colors.status.success,
    cancelled: modernTokens.colors.status.error,
    failed: modernTokens.colors.status.error,
    success: modernTokens.colors.status.success,
    warning: modernTokens.colors.status.warning,
    error: modernTokens.colors.status.error,
    info: modernTokens.colors.status.info,
  };

  return statusMap[status.toLowerCase()] || modernTokens.colors.text.secondary;
}

export function getStatusGradient(status: string): string {
  const gradientMap: Record<string, string> = {
    success: modernTokens.gradients.success,
    completed: modernTokens.gradients.success,
    delivered: modernTokens.gradients.success,
    warning: modernTokens.gradients.warning,
    pending: modernTokens.gradients.warning,
    error: modernTokens.gradients.error,
    failed: modernTokens.gradients.error,
    cancelled: modernTokens.gradients.error,
    info: modernTokens.gradients.primary,
    active: modernTokens.gradients.primary,
  };

  return gradientMap[status.toLowerCase()] || modernTokens.gradients.card;
}

export default modernTokens;
