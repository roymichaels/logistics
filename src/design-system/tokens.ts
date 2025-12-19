export const colors = {
  background: {
    primary: '#141821',
    secondary: '#1A1F2A',
    tertiary: '#202736',
    elevated: '#202736',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#D0D3DB',
    tertiary: '#9CA3AF',
    inverse: '#141821',
    muted: 'rgba(255, 255, 255, 0.55)',
  },
  brand: {
    primary: '#6A4BFF',
    hover: '#7D5EFF',
    pressed: '#5A3FE8',
    faded: 'rgba(106, 75, 255, 0.1)',
    secondary: '#A066FF',
    accent: '#F0C674',
  },
  security: {
    high: '#4ADE80',
    highFaded: 'rgba(74, 222, 128, 0.1)',
    medium: '#FBBF24',
    mediumFaded: 'rgba(251, 191, 36, 0.1)',
    low: '#F87171',
    lowFaded: 'rgba(248, 113, 113, 0.1)',
    critical: '#EF4444',
  },
  status: {
    success: '#4ADE80',
    successFaded: 'rgba(74, 222, 128, 0.1)',
    warning: '#FBBF24',
    warningFaded: 'rgba(251, 191, 36, 0.1)',
    error: '#F87171',
    errorFaded: 'rgba(248, 113, 113, 0.1)',
    info: '#60A5FA',
    infoFaded: 'rgba(96, 165, 250, 0.1)',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.15)',
    hover: 'rgba(255, 255, 255, 0.25)',
    focus: '#6A4BFF',
    accent: '#F0C674',
  },
  ui: {
    card: '#1A1F2A',
    cardHover: '#202736',
    overlay: 'rgba(20, 24, 33, 0.85)',
    highlight: 'rgba(106, 75, 255, 0.15)',
    glow: 'rgba(106, 75, 255, 0.3)',
  },
  interactive: {
    hover: '#202736',
    active: '#6A4BFF',
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
  xl: '24px',
  '2xl': '32px',
  '3xl': '40px',
  '4xl': '48px',
  '5xl': '64px',
  '6xl': '80px',
} as const;

export const typography = {
  fontFamily: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  '2xl': '28px',
  '3xl': '32px',
  '4xl': '40px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 2px 6px rgba(0, 0, 0, 0.25)',
  md: '0 4px 12px rgba(0, 0, 0, 0.30)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.35)',
  xl: '0 12px 32px rgba(0, 0, 0, 0.40)',
  '2xl': '0 16px 40px rgba(0, 0, 0, 0.45)',
  glow: '0 0 12px rgba(106, 75, 255, 0.3)',
  glowLarge: '0 0 20px rgba(106, 75, 255, 0.4)',
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
  focus: '0 0 0 2px rgba(106, 75, 255, 0.7)',
  focusLarge: '0 0 0 4px rgba(106, 75, 255, 0.5)',
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
  primary: 'linear-gradient(135deg, #6A4BFF 0%, #A066FF 100%)',
  secondary: 'linear-gradient(135deg, #A066FF 0%, #F0C674 100%)',
  card: 'linear-gradient(180deg, #1A1F2A 0%, #141821 100%)',
  overlay: 'linear-gradient(180deg, rgba(20, 24, 33, 0) 0%, rgba(20, 24, 33, 0.95) 100%)',
  success: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
  warning: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
  error: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
  glow: 'radial-gradient(circle at center, rgba(106, 75, 255, 0.2) 0%, transparent 70%)',
  cyber: 'linear-gradient(135deg, #6A4BFF 0%, #A066FF 50%, #F0C674 100%)',
} as const;

export const navigation = {
  background: 'rgba(20, 24, 33, 0.85)',
  backdropFilter: 'blur(16px)',
  border: 'rgba(255, 255, 255, 0.08)',
} as const;
