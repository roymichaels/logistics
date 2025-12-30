/**
 * UndergroundLab Security Store Design System
 * Professional dark cyber aesthetic for security hardware
 * Enterprise-grade visual identity
 */

export const colors = {
  background: {
    primary: '#141821',      // Soft dark background
    secondary: '#1A1F2A',    // Card background
    tertiary: '#202736',     // Elevated surfaces
    elevated: '#202736',     // Modals and overlays
    accent: '#252B3A',       // Hover states
  },

  text: {
    primary: '#FFFFFF',      // Pure white text
    secondary: '#D0D3DB',    // Secondary text
    tertiary: '#9CA3AF',     // Muted text
    inverse: '#141821',      // Text on light backgrounds
    muted: 'rgba(255, 255, 255, 0.55)', // Disabled text
  },

  brand: {
    primary: '#3B82F6',      // Professional blue
    primaryHover: '#60A5FA', // Blue hover
    primaryPressed: '#2563EB', // Blue pressed
    primaryFaded: 'rgba(59, 130, 246, 0.1)', // Faded blue
    secondary: '#60A5FA',    // Light blue
    accent: '#F0C674',       // Gold accent
    hover: '#60A5FA',        // Hover state blue
  },

  security: {
    high: '#4ADE80',         // Soft green (highly secure)
    highFaded: 'rgba(74, 222, 128, 0.1)',
    medium: '#FBBF24',       // Warm yellow (moderate security)
    mediumFaded: 'rgba(251, 191, 36, 0.1)',
    low: '#F87171',          // Soft red (vulnerable)
    lowFaded: 'rgba(248, 113, 113, 0.1)',
    critical: '#EF4444',     // Critical alert
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
    primary: 'rgba(255, 255, 255, 0.08)',  // Subtle borders
    secondary: 'rgba(255, 255, 255, 0.15)', // Default borders
    hover: 'rgba(255, 255, 255, 0.25)',     // Hover state borders
    focus: '#3B82F6',        // Focus state (blue)
    accent: '#F0C674',       // Accent border (gold)
  },

  ui: {
    card: '#1A1F2A',
    cardHover: '#202736',
    overlay: 'rgba(20, 24, 33, 0.85)',
    highlight: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.3)',
  },

  interactive: {
    hover: '#202736',
    active: '#3B82F6',
    disabled: '#4B5563',
  },

  white: '#FFFFFF',
  black: '#000000',
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
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: '"SF Mono", Monaco, "Courier New", Courier, monospace',
  },

  fontSize: {
    xs: '12px',   // Small labels, timestamps
    sm: '14px',   // Secondary text, captions
    base: '16px', // Body text
    lg: '20px',   // Large body, emphasized text
    xl: '24px',   // Headings, section titles
    '2xl': '28px',// Large headings
    '3xl': '32px',// Display text
    '4xl': '40px',// Large display
    '5xl': '48px',// Extra large display
  },

  fontWeight: {
    normal: '400',   // Regular text
    medium: '500',   // Medium emphasis
    semibold: '600', // Semibold
    bold: '700',     // Bold text
    heavy: '800',    // Heavy (display, emphasized)
  },

  lineHeight: {
    tight: '1.2',       // Headlines
    normal: '1.5',      // Body text
    relaxed: '1.75',    // Comfortable reading
  },

  letterSpacing: {
    tight: '-0.01em',   // Headings
    normal: '0',        // Body text
    wide: '0.01em',     // Uppercase labels
  },
} as const;

export const borderRadius = {
  none: '0',
  sm: '6px',     // Small elements
  md: '10px',    // Subtle rounding
  lg: '16px',    // Small cards/images
  xl: '24px',    // Cards and containers
  '2xl': '28px', // Buttons and inputs
  '3xl': '32px', // Large cards
  '4xl': '40px', // Extra large rounding
  full: '9999px',// Circular elements (avatars, pills)
} as const;

export const shadows = {
  none: 'none',
  sm: '0 2px 6px rgba(0, 0, 0, 0.25)',          // Subtle shadow (cards at rest)
  md: '0 4px 12px rgba(0, 0, 0, 0.30)',         // Card hover shadow
  lg: '0 8px 24px rgba(0, 0, 0, 0.35)',         // Elevated elements
  xl: '0 12px 32px rgba(0, 0, 0, 0.40)',        // Modal shadow
  '2xl': '0 16px 40px rgba(0, 0, 0, 0.45)',     // High elevation
  glow: '0 0 12px rgba(59, 130, 246, 0.3)',     // Blue glow
  glowLarge: '0 0 20px rgba(59, 130, 246, 0.4)',// Large blue glow
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.08)', // Inner shadow
  focus: '0 0 0 2px rgba(59, 130, 246, 0.7)',   // Focus ring
  focusLarge: '0 0 0 4px rgba(59, 130, 246, 0.5)', // Large focus ring
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

// Gradient definitions for modern aesthetic
export const gradients = {
  primary: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  secondary: 'linear-gradient(135deg, #60A5FA 0%, #F0C674 100%)',
  card: 'linear-gradient(180deg, #1A1F2A 0%, #141821 100%)',
  overlay: 'linear-gradient(180deg, rgba(20, 24, 33, 0) 0%, rgba(20, 24, 33, 0.95) 100%)',
  success: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
  warning: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
  error: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
  glow: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
  cyber: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #F0C674 100%)',
} as const;

// Navigation specific values (for glass morphism effects)
export const navigation = {
  background: 'rgba(20, 24, 33, 0.85)',
  backdropFilter: 'blur(16px)',
  border: 'rgba(255, 255, 255, 0.08)',
} as const;
