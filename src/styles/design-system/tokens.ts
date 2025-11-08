/**
 * Design System Tokens
 * Consolidated from twitterTheme, royalTheme, and orderTheme
 * Single source of truth for all design values
 */

export const colors = {
  background: {
    primary: '#0A0E14',
    secondary: '#131920',
    tertiary: '#1C2128',
    elevated: '#192734',
  },

  text: {
    primary: '#E8EAED',
    secondary: '#9BA1A6',
    tertiary: '#6B7280',
    inverse: '#0A0E14',
    muted: '#8899A6',
  },

  brand: {
    primary: '#00D9FF',
    primaryHover: '#00C4E6',
    primaryPressed: '#00B0CC',
    primaryFaded: 'rgba(0, 217, 255, 0.1)',
  },

  accent: {
    blue: '#1D9BF0',
    cyan: '#00D9FF',
    purple: '#8B5CF6',
    gold: '#FFD400',
  },

  status: {
    success: '#10B981',
    successFaded: 'rgba(16, 185, 129, 0.1)',
    warning: '#F59E0B',
    warningFaded: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444',
    errorFaded: 'rgba(239, 68, 68, 0.1)',
    info: '#06B6D4',
    infoFaded: 'rgba(6, 182, 212, 0.1)',
  },

  border: {
    primary: '#2D333B',
    secondary: '#38444D',
    hover: '#3D444D',
    focus: '#00D9FF',
  },

  ui: {
    card: '#131920',
    cardHover: '#1C2128',
    overlay: 'rgba(10, 14, 20, 0.75)',
    highlight: 'rgba(0, 217, 255, 0.12)',
  },

  interactive: {
    hover: '#1C2128',
    active: '#00D9FF',
    disabled: '#6B7280',
  },

  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

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

export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Courier New", Courier, monospace',
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
    '4xl': '32px',
    '5xl': '40px',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
  md: '0 1px 3px rgba(0, 0, 0, 0.4)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.4)',
  xl: '0 4px 16px rgba(0, 0, 0, 0.5)',
  glow: '0 0 12px rgba(0, 217, 255, 0.3)',
  glowLarge: '0 0 24px rgba(0, 217, 255, 0.4)',
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
} as const;

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;
