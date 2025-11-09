/**
 * Unified Design System - Single Source of Truth
 * Based on Twitter/X Dark Theme with consistent design tokens
 * All dashboards must use this theme exclusively
 */

// ===========================
// COLOR SYSTEM
// ===========================

export const colors = {
  // Background colors
  background: {
    primary: '#15202B',      // Main dark background
    secondary: '#192734',    // Elevated surfaces (cards)
    tertiary: '#1C2833',     // Hover states
    elevated: '#22303C',     // Modals and overlays
  },

  // Text colors
  text: {
    primary: '#E7E9EA',      // Primary text
    secondary: '#8899A6',    // Secondary text
    tertiary: '#536471',     // Muted text
    inverse: '#0F1419',      // Text on light backgrounds
    disabled: '#6E767D',     // Disabled text
  },

  // Brand colors (Twitter blue)
  brand: {
    primary: '#1DA1F2',
    hover: '#1A91DA',
    pressed: '#1781BF',
    faded: 'rgba(29, 161, 242, 0.1)',
  },

  // Status colors
  status: {
    success: '#00BA7C',
    successFaded: 'rgba(0, 186, 124, 0.1)',
    warning: '#FFAD1F',
    warningFaded: 'rgba(255, 173, 31, 0.1)',
    error: '#F4212E',
    errorFaded: 'rgba(244, 33, 46, 0.1)',
    info: '#1DA1F2',
    infoFaded: 'rgba(29, 161, 242, 0.1)',
  },

  // Border colors
  border: {
    primary: '#38444D',
    secondary: '#2F3336',
    hover: '#536471',
    focus: '#1DA1F2',
  },

  // UI elements
  ui: {
    card: '#192734',
    cardHover: '#1C2833',
    overlay: 'rgba(91, 112, 131, 0.4)',
    highlight: 'rgba(29, 161, 242, 0.1)',
  },

  // Role-specific accent colors (subtle tints)
  role: {
    infrastructure: '#8B5CF6',  // Purple tint
    business: '#3B82F6',        // Blue tint
    manager: '#10B981',         // Green tint
    driver: '#F59E0B',          // Amber tint
    warehouse: '#6366F1',       // Indigo tint
    sales: '#EC4899',           // Pink tint
  },

  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

// ===========================
// SPACING SYSTEM (4px grid)
// ===========================

export const spacing = {
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
} as const;

// ===========================
// TYPOGRAPHY SYSTEM
// ===========================

export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
  },

  fontSize: {
    xs: '13px',
    sm: '14px',
    base: '15px',
    lg: '17px',
    xl: '20px',
    '2xl': '23px',
    '3xl': '28px',
    '4xl': '32px',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },

  lineHeight: {
    tight: '1.3125',
    normal: '1.375',
    relaxed: '1.5',
  },
} as const;

// ===========================
// LAYOUT & STYLING
// ===========================

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
  md: '0 2px 8px rgba(0, 0, 0, 0.15)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.25)',
  '2xl': '0 12px 24px rgba(0, 0, 0, 0.3)',
  glow: '0 0 16px rgba(29, 161, 242, 0.4)',
  glowLarge: '0 0 24px rgba(29, 161, 242, 0.5)',
  focus: '0 0 0 2px rgba(29, 161, 242, 0.2)',
} as const;

export const transitions = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  toast: 1070,
} as const;

// ===========================
// GRADIENTS
// ===========================

export const gradients = {
  primary: 'linear-gradient(135deg, #1DA1F2 0%, #1781BF 100%)',
  success: 'linear-gradient(135deg, #00BA7C 0%, #00A368 100%)',
  warning: 'linear-gradient(135deg, #FFAD1F 0%, #FFA500 100%)',
  error: 'linear-gradient(135deg, #F4212E 0%, #C9191E 100%)',
  card: 'linear-gradient(180deg, #192734 0%, #15202B 100%)',
} as const;

// ===========================
// COMPONENT STYLES
// ===========================

export const components = {
  // Dashboard page container
  pageContainer: {
    minHeight: '100vh',
    background: colors.background.primary,
    padding: spacing.xl,
    paddingBottom: '100px',
  },

  // Page header
  pageHeader: {
    marginBottom: spacing['3xl'],
  },

  pageTitle: {
    margin: 0,
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  pageSubtitle: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },

  // Card styles
  card: {
    background: colors.ui.card,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    marginBottom: spacing.xl,
    boxShadow: shadows.sm,
    transition: transitions.normal,
  },

  cardTitle: {
    margin: `0 0 ${spacing.lg} 0`,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },

  // Button styles
  button: {
    primary: {
      padding: `${spacing.md} ${spacing['2xl']}`,
      background: gradients.primary,
      border: 'none',
      borderRadius: borderRadius.lg,
      color: colors.white,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      cursor: 'pointer',
      boxShadow: shadows.glow,
      transition: transitions.normal,
    },
    secondary: {
      padding: `${spacing.md} ${spacing['2xl']}`,
      background: 'transparent',
      border: `2px solid ${colors.brand.primary}`,
      borderRadius: borderRadius.lg,
      color: colors.brand.primary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: transitions.normal,
    },
    ghost: {
      padding: `${spacing.md} ${spacing.xl}`,
      background: 'transparent',
      border: 'none',
      borderRadius: borderRadius.lg,
      color: colors.text.secondary,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      cursor: 'pointer',
      transition: transitions.normal,
    },
  },

  // Badge styles
  badge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: `6px ${spacing.md}`,
      borderRadius: borderRadius.md,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    success: {
      background: colors.status.successFaded,
      border: `1px solid ${colors.status.success}50`,
      color: colors.status.success,
    },
    warning: {
      background: colors.status.warningFaded,
      border: `1px solid ${colors.status.warning}50`,
      color: colors.status.warning,
    },
    error: {
      background: colors.status.errorFaded,
      border: `1px solid ${colors.status.error}50`,
      color: colors.status.error,
    },
    info: {
      background: colors.status.infoFaded,
      border: `1px solid ${colors.status.info}50`,
      color: colors.status.info,
    },
  },

  // Input styles
  input: {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.primary}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    outline: 'none',
    transition: transitions.normal,
  },

  // Empty state
  emptyState: {
    textAlign: 'center' as const,
    padding: `${spacing['5xl']} ${spacing.xl}`,
    color: colors.text.secondary,
  },
} as const;

// ===========================
// UTILITY FUNCTIONS
// ===========================

export function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes('success') || normalized.includes('completed') || normalized.includes('delivered')) {
    return colors.status.success;
  }
  if (normalized.includes('pending') || normalized.includes('warning')) {
    return colors.status.warning;
  }
  if (normalized.includes('error') || normalized.includes('cancelled') || normalized.includes('failed')) {
    return colors.status.error;
  }

  return colors.status.info;
}

export function getStatusBadgeStyle(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes('success') || normalized.includes('completed') || normalized.includes('delivered')) {
    return { ...components.badge.base, ...components.badge.success };
  }
  if (normalized.includes('pending') || normalized.includes('warning')) {
    return { ...components.badge.base, ...components.badge.warning };
  }
  if (normalized.includes('error') || normalized.includes('cancelled') || normalized.includes('failed')) {
    return { ...components.badge.base, ...components.badge.error };
  }

  return { ...components.badge.base, ...components.badge.info };
}

export function getRoleAccentColor(role: string): string {
  const roleMap: Record<string, string> = {
    infrastructure_owner: colors.role.infrastructure,
    business_owner: colors.role.business,
    manager: colors.role.manager,
    driver: colors.role.driver,
    warehouse: colors.role.warehouse,
    sales: colors.role.sales,
  };

  return roleMap[role] || colors.brand.primary;
}

// Export unified theme object
export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  gradients,
  components,
} as const;

export default theme;
