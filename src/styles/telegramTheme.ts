/**
 * Telegram Design System
 * Authentic Telegram dark theme colors and tokens
 * Based on Telegram's iOS/Android dark mode
 */

export const TELEGRAM_COLORS = {
  // Background colors - Telegram's signature dark blue
  background: {
    primary: '#15202B',           // Main dark background
    secondary: '#192734',         // Elevated surfaces
    tertiary: '#1E2329',          // Cards and containers
    elevated: 'rgba(30, 30, 35, 0.8)', // Glass morphism cards
    hover: '#1C2833',             // Hover states
  },

  // Text colors
  text: {
    primary: '#E7E9EA',           // Primary text (off-white)
    secondary: '#71767B',         // Secondary text (gray)
    tertiary: '#536471',          // Muted text
    inverse: '#0F1419',           // Text on light backgrounds
    link: '#1D9BF0',              // Links and interactive text
  },

  // Telegram blue - primary accent
  accent: {
    primary: '#1D9BF0',           // Telegram blue
    hover: '#1A8CD8',             // Hover state
    pressed: '#1781BF',           // Pressed state
    faded: 'rgba(29, 155, 240, 0.1)',   // Faded background
    light: 'rgba(29, 155, 240, 0.15)',  // Light background
    border: 'rgba(29, 155, 240, 0.3)',  // Border color
  },

  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',    // Subtle borders
    secondary: 'rgba(255, 255, 255, 0.15)', // Default borders
    hover: 'rgba(255, 255, 255, 0.2)',      // Hover state
    focus: '#1D9BF0',                        // Focus ring
  },

  // Status colors
  status: {
    success: '#00BA7C',           // Green
    successFaded: 'rgba(0, 186, 124, 0.1)',
    warning: '#FFAD1F',           // Orange/Yellow
    warningFaded: 'rgba(255, 173, 31, 0.1)',
    error: '#F4212E',             // Red
    errorFaded: 'rgba(244, 33, 46, 0.1)',
    info: '#1D9BF0',              // Blue
    infoFaded: 'rgba(29, 155, 240, 0.1)',
  },

  // Online status indicators
  presence: {
    online: '#00BA7C',            // Green dot
    offline: '#536471',           // Gray dot
    busy: '#F4212E',              // Red dot
    away: '#FFAD1F',              // Yellow dot
  },

  // Button colors
  button: {
    primary: '#1D9BF0',
    primaryHover: '#1A8CD8',
    primaryText: '#FFFFFF',
    secondary: 'transparent',
    secondaryBorder: 'rgba(29, 155, 240, 0.3)',
    secondaryHover: 'rgba(29, 155, 240, 0.1)',
    secondaryText: '#1D9BF0',
  },

  // Card colors
  card: {
    background: 'rgba(30, 30, 35, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
    hover: 'rgba(35, 35, 40, 0.8)',
  },

  // Input colors
  input: {
    background: '#192734',
    border: 'rgba(255, 255, 255, 0.1)',
    borderFocus: '#1D9BF0',
    placeholder: '#71767B',
    text: '#E7E9EA',
  },

  // Shadow and effects
  shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  shadowLarge: '0 12px 48px rgba(0, 0, 0, 0.4)',
  glow: '0 0 16px rgba(29, 155, 240, 0.4)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Telegram spacing system (based on 4px grid)
export const TELEGRAM_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
} as const;

// Telegram typography
export const TELEGRAM_TYPOGRAPHY = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '15px',
    lg: '17px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '28px',
    '4xl': '32px',
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
    relaxed: '1.6',
  },
} as const;

// Telegram border radius
export const TELEGRAM_RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  full: '9999px',
} as const;

// Telegram transitions
export const TELEGRAM_TRANSITIONS = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

// Component-specific presets
export const TELEGRAM_COMPONENTS = {
  // Avatar sizes
  avatar: {
    small: '32px',
    medium: '40px',
    large: '64px',
    xlarge: '96px',
    profile: '140px',
  },

  // Button presets
  button: {
    height: {
      small: '32px',
      medium: '40px',
      large: '48px',
    },
    padding: {
      small: '8px 16px',
      medium: '10px 24px',
      large: '12px 32px',
    },
  },

  // Input presets
  input: {
    height: '44px',
    padding: '12px 16px',
    borderRadius: '12px',
  },

  // Card presets
  card: {
    padding: '24px',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
  },

  // Modal presets
  modal: {
    maxWidth: '500px',
    borderRadius: '16px',
    padding: '24px',
  },
} as const;

// Glass morphism effect
export const TELEGRAM_GLASS = {
  background: 'rgba(30, 30, 35, 0.8)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  shadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
} as const;

// Export default theme object
export const TELEGRAM_THEME = {
  colors: TELEGRAM_COLORS,
  spacing: TELEGRAM_SPACING,
  typography: TELEGRAM_TYPOGRAPHY,
  radius: TELEGRAM_RADIUS,
  transitions: TELEGRAM_TRANSITIONS,
  components: TELEGRAM_COMPONENTS,
  glass: TELEGRAM_GLASS,
} as const;

export default TELEGRAM_THEME;
