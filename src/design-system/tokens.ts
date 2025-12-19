export const colors = {
  background: {
    primary: '#0A0E14',
    secondary: '#131821',
    tertiary: '#1A1F2E',
    elevated: '#1F2937',
  },
  text: {
    primary: '#F9FAFB',
    secondary: '#D1D5DB',
    tertiary: '#9CA3AF',
    inverse: '#0A0E14',
    muted: '#6B7280',
  },
  brand: {
    primary: '#00D9FF',
    hover: '#00C4EA',
    pressed: '#00A8CC',
    faded: 'rgba(0, 217, 255, 0.1)',
    secondary: '#0066FF',
    accent: '#7B61FF',
  },
  security: {
    high: '#00FF94',
    highFaded: 'rgba(0, 255, 148, 0.1)',
    medium: '#FFB800',
    mediumFaded: 'rgba(255, 184, 0, 0.1)',
    low: '#FF3B30',
    lowFaded: 'rgba(255, 59, 48, 0.1)',
    critical: '#FF0055',
  },
  status: {
    success: '#00FF94',
    successFaded: 'rgba(0, 255, 148, 0.1)',
    warning: '#FFB800',
    warningFaded: 'rgba(255, 184, 0, 0.1)',
    error: '#FF3B30',
    errorFaded: 'rgba(255, 59, 48, 0.1)',
    info: '#00D9FF',
    infoFaded: 'rgba(0, 217, 255, 0.1)',
  },
  border: {
    primary: '#2D3748',
    secondary: '#1F2937',
    hover: '#374151',
    focus: '#00D9FF',
    accent: '#00D9FF',
  },
  ui: {
    card: '#131821',
    cardHover: '#1A1F2E',
    overlay: 'rgba(10, 14, 20, 0.85)',
    highlight: 'rgba(0, 217, 255, 0.15)',
    glow: 'rgba(0, 217, 255, 0.3)',
  },
  interactive: {
    hover: '#1A1F2E',
    active: '#00D9FF',
    disabled: '#4B5563',
  },
  white: '#FFFFFF',
  black: '#000000',
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
    '5xl': '40px',
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

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '28px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
  md: '0 2px 8px rgba(0, 0, 0, 0.15)',
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.25)',
  '2xl': '0 12px 24px rgba(0, 0, 0, 0.3)',
  glow: '0 0 16px rgba(0, 217, 255, 0.4)',
  glowLarge: '0 0 24px rgba(0, 217, 255, 0.5)',
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
  focus: '0 0 0 2px rgba(0, 217, 255, 0.2)',
  focusLarge: '0 0 0 4px rgba(0, 217, 255, 0.15)',
} as const;

export const transitions = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
  drawer: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
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
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

export const iconSizes = {
  xs: '16px',
  sm: '20px',
  md: '24px',
  lg: '32px',
  xl: '40px',
  '2xl': '48px',
} as const;

export const backdropBlur = {
  none: 'none',
  sm: 'blur(4px)',
  md: 'blur(8px)',
  lg: 'blur(12px)',
  xl: 'blur(16px)',
  '2xl': 'blur(20px)',
} as const;

export const gradients = {
  primary: 'linear-gradient(135deg, #00D9FF 0%, #0066FF 100%)',
  secondary: 'linear-gradient(135deg, #0066FF 0%, #7B61FF 100%)',
  card: 'linear-gradient(180deg, #131821 0%, #0A0E14 100%)',
  overlay: 'linear-gradient(180deg, rgba(10, 14, 20, 0) 0%, rgba(10, 14, 20, 0.95) 100%)',
  success: 'linear-gradient(135deg, #00FF94 0%, #00D47E 100%)',
  warning: 'linear-gradient(135deg, #FFB800 0%, #FFA000 100%)',
  error: 'linear-gradient(135deg, #FF3B30 0%, #DC2626 100%)',
  glow: 'radial-gradient(circle at center, rgba(0, 217, 255, 0.2) 0%, transparent 70%)',
  cyber: 'linear-gradient(135deg, #00D9FF 0%, #7B61FF 50%, #FF0055 100%)',
} as const;

export const navigation = {
  background: 'rgba(10, 14, 20, 0.85)',
  backdropFilter: 'blur(16px)',
  border: 'rgba(45, 55, 72, 0.6)',
} as const;
