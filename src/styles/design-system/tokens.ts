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
  xs: '4px',     // 0.25rem - Twitter's base unit (4px grid system)
  sm: '8px',     // 0.5rem - Double base
  md: '12px',    // 0.75rem - Triple base
  lg: '16px',    // 1rem - Quadruple base (standard padding)
  xl: '20px',    // 1.25rem - Five times base
  '2xl': '24px', // 1.5rem - Six times base
  '3xl': '32px', // 2rem - Eight times base
  '4xl': '40px', // 2.5rem - Ten times base
  '5xl': '48px', // 3rem - Twelve times base
  '6xl': '64px', // 4rem - Sixteen times base
} as const;

// Twitter's micro-spacing for precise layouts
export const microSpacing = {
  '2': '2px',   // Half base unit
  '4': '4px',   // Base unit
  '6': '6px',   // 1.5x base
  '10': '10px', // 2.5x base
  '14': '14px', // 3.5x base
  '18': '18px', // 4.5x base
} as const;

export const typography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
  },

  fontSize: {
    xs: '13px',   // Small labels, timestamps
    sm: '14px',   // Secondary text, captions
    base: '15px', // Body text (Twitter's base)
    lg: '17px',   // Large body, emphasized text
    xl: '20px',   // Headings, section titles
    '2xl': '23px',// Large headings
    '3xl': '28px',// Display text
    '4xl': '32px',// Large display
    '5xl': '40px',// Extra large display
  },

  fontWeight: {
    normal: '400',   // Regular text
    medium: '500',   // Medium emphasis (rare in Twitter)
    semibold: '600', // Semibold (rare in Twitter)
    bold: '700',     // Bold text (Twitter's primary bold weight)
    heavy: '800',    // Heavy (display, emphasized)
  },

  lineHeight: {
    tight: '1.3125',    // Headlines (Twitter exact)
    normal: '1.375',    // Body text (Twitter exact)
    relaxed: '1.5',     // Comfortable reading
  },

  letterSpacing: {
    tight: '-0.01em',   // Headings
    normal: '0',        // Body text
    wide: '0.01em',     // Uppercase labels
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '4px',     // Small elements
  md: '8px',     // Subtle rounding
  lg: '12px',    // Small cards/images
  xl: '16px',    // Cards and containers (Twitter card standard)
  '2xl': '20px', // Buttons and inputs (Twitter standard)
  '3xl': '24px', // Large cards
  '4xl': '28px', // Extra large rounding
  full: '9999px',// Circular elements (avatars, pills)
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(0, 0, 0, 0.12)',          // Subtle shadow (cards at rest)
  md: '0 2px 8px rgba(0, 0, 0, 0.15)',          // Card hover shadow
  lg: '0 4px 12px rgba(0, 0, 0, 0.15)',         // Elevated elements
  xl: '0 8px 16px rgba(0, 0, 0, 0.25)',         // Modal shadow
  '2xl': '0 12px 24px rgba(0, 0, 0, 0.3)',      // High elevation
  glow: '0 0 16px rgba(29, 161, 242, 0.4)',     // Twitter blue glow
  glowLarge: '0 0 24px rgba(29, 161, 242, 0.5)',// Large blue glow
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)', // Inner shadow
  focus: '0 0 0 2px rgba(29, 161, 242, 0.2)',   // Focus ring
  focusLarge: '0 0 0 4px rgba(29, 161, 242, 0.15)', // Large focus ring
} as const;

export const transitions = {
  fast: '150ms ease-in-out',                      // Quick interactions
  normal: '200ms ease-in-out',                    // Standard transitions (Twitter default)
  slow: '300ms ease-in-out',                      // Smooth animations
  drawer: '300ms cubic-bezier(0.4, 0, 0.2, 1)',   // Modal/drawer slide
  bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Spring bounce
  elastic: '600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Elastic effect
} as const;

// Twitter's specific animation timing functions
export const easings = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
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

// Twitter's icon sizing system
export const iconSizes = {
  xs: '16px',  // Small icons
  sm: '20px',  // Standard icons (Twitter default)
  md: '24px',  // Medium icons
  lg: '32px',  // Large icons
  xl: '40px',  // Extra large icons
  '2xl': '48px', // Display icons
} as const;

// Twitter's elevation levels (z-index + shadow combinations)
export const elevation = {
  0: { zIndex: 0, shadow: shadows.none },
  1: { zIndex: 1, shadow: shadows.sm },
  2: { zIndex: 2, shadow: shadows.md },
  3: { zIndex: 3, shadow: shadows.lg },
  4: { zIndex: 4, shadow: shadows.xl },
  5: { zIndex: 5, shadow: shadows['2xl'] },
} as const;

// Twitter's backdrop blur values
export const backdropBlur = {
  none: 'none',
  sm: 'blur(4px)',
  md: 'blur(8px)',
  lg: 'blur(12px)',  // Twitter's standard header/nav blur
  xl: 'blur(16px)',
  '2xl': 'blur(20px)',
} as const;

// Gradient definitions for convenience
export const gradients = {
  primary: 'linear-gradient(135deg, #1DA1F2 0%, #1781BF 100%)',
  card: 'linear-gradient(180deg, #192734 0%, #15202B 100%)',
  overlay: 'linear-gradient(180deg, rgba(21, 32, 43, 0) 0%, rgba(21, 32, 43, 0.9) 100%)',
  success: 'linear-gradient(135deg, #00BA7C 0%, #00A368 100%)',
  warning: 'linear-gradient(135deg, #FFAD1F 0%, #FFA500 100%)',
  error: 'linear-gradient(135deg, #F4212E 0%, #C9191E 100%)',
} as const;

// Navigation specific values (for glass morphism effects)
export const navigation = {
  background: 'rgba(21, 32, 43, 0.85)',
  backdropFilter: 'blur(12px)',
  border: 'rgba(56, 68, 77, 0.6)',
} as const;
