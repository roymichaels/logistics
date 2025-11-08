/**
 * Twitter/X Design System Tokens
 * Authentic Twitter dark theme colors and design values
 * Based on Twitter's current design system
 */

export const colors = {
  background: {
    primary: '#15202B',      // Twitter's main dark background
    secondary: '#192734',    // Elevated surfaces
    tertiary: '#1C2833',     // Hover states
    elevated: '#22303C',     // Modals and overlays
  },

  text: {
    primary: '#E7E9EA',      // Primary text (off-white)
    secondary: '#8899A6',    // Secondary text (blue-gray)
    tertiary: '#536471',     // Muted text
    inverse: '#0F1419',      // Text on light backgrounds
    muted: '#6E767D',        // Disabled text
  },

  brand: {
    primary: '#1DA1F2',      // Twitter blue
    primaryHover: '#1A91DA', // Twitter blue hover
    primaryPressed: '#1781BF', // Twitter blue pressed
    primaryFaded: 'rgba(29, 161, 242, 0.1)', // Faded Twitter blue
  },

  accent: {
    blue: '#1DA1F2',     // Primary Twitter blue
    pink: '#F91880',     // Twitter pink (likes)
    green: '#00BA7C',    // Twitter green (retweets)
    yellow: '#F4B731',   // Twitter yellow
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
    primary: '#38444D',      // Default borders
    secondary: '#2F3336',    // Subtle borders
    hover: '#536471',        // Hover state borders
    focus: '#1DA1F2',        // Focus state (Twitter blue)
  },

  ui: {
    card: '#192734',
    cardHover: '#1C2833',
    overlay: 'rgba(91, 112, 131, 0.4)',  // Twitter's modal overlay
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
  xs: '4px',     // 0.25rem - Twitter's base unit
  sm: '8px',     // 0.5rem
  md: '12px',    // 0.75rem
  lg: '16px',    // 1rem
  xl: '20px',    // 1.25rem
  '2xl': '24px', // 1.5rem
  '3xl': '32px', // 2rem
  '4xl': '40px', // 2.5rem
  '5xl': '48px', // 3rem
  '6xl': '64px', // 4rem
} as const;

export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
  },

  fontSize: {
    xs: '13px',   // Small labels
    sm: '14px',   // Secondary text
    base: '15px', // Body text (Twitter's base)
    lg: '17px',   // Large body
    xl: '20px',   // Headings
    '2xl': '23px',// Large headings
    '3xl': '28px',// Display text
    '4xl': '32px',// Large display
    '5xl': '40px',// Extra large display
  },

  fontWeight: {
    normal: '400',   // Regular text
    medium: '500',   // Medium emphasis
    semibold: '600', // Semibold
    bold: '700',     // Bold text
    heavy: '800',    // Heavy (display)
  },

  lineHeight: {
    tight: '1.3',    // Headlines
    normal: '1.4',   // Body text
    relaxed: '1.5',  // Comfortable reading
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',    // Small cards/images
  xl: '16px',    // Cards and containers
  '2xl': '20px', // Buttons and inputs (Twitter standard)
  '3xl': '24px', // Large cards
  full: '9999px',// Circular elements
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.12)',          // Subtle shadow
  md: '0 2px 8px rgba(0, 0, 0, 0.15)',          // Card shadow
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',         // Elevated shadow
  xl: '0 8px 16px rgba(0, 0, 0, 0.25)',         // Modal shadow
  glow: '0 0 16px rgba(29, 161, 242, 0.4)',     // Twitter blue glow
  glowLarge: '0 0 24px rgba(29, 161, 242, 0.5)',// Large blue glow
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)', // Inner shadow
} as const;

export const transitions = {
  fast: '150ms ease-in-out',       // Quick interactions
  normal: '200ms ease-in-out',     // Standard transitions (Twitter default)
  slow: '300ms ease-in-out',       // Smooth animations
  drawer: '300ms cubic-bezier(0.4, 0, 0.2, 1)', // Modal/drawer slide
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
