export const colors = {
  background: {
    primary: '#15202B',
    secondary: '#192734',
    tertiary: '#1C2833',
    elevated: '#22303C',
  },
  text: {
    primary: '#E7E9EA',
    secondary: '#8899A6',
    tertiary: '#536471',
    inverse: '#0F1419',
    muted: '#6E767D',
  },
  brand: {
    primary: '#1DA1F2',
    hover: '#1A91DA',
    pressed: '#1781BF',
    faded: 'rgba(29, 161, 242, 0.1)',
  },
  accent: {
    blue: '#1DA1F2',
    pink: '#F91880',
    green: '#00BA7C',
    yellow: '#F4B731',
  },
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
  border: {
    primary: '#38444D',
    secondary: '#2F3336',
    hover: '#536471',
    focus: '#1DA1F2',
  },
  ui: {
    card: '#192734',
    cardHover: '#1C2833',
    overlay: 'rgba(91, 112, 131, 0.4)',
    highlight: 'rgba(29, 161, 242, 0.1)',
  },
  interactive: {
    hover: '#1C2833',
    active: '#1DA1F2',
    disabled: '#536471',
  },
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
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
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
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
