/**
 * Twitter/X Dark Theme Color System
 * Authentic Twitter design system colors
 * Based on Twitter's current dark mode theme
 */

export const TWITTER_COLORS = {
  // Background colors - Twitter's dark blue-black theme
  background: '#15202B', // Twitter's main dark background
  backgroundSecondary: '#192734', // Elevated surfaces
  backgroundHover: '#1C2833', // Hover states

  // Primary accent - Twitter blue
  primary: '#1DA1F2', // Twitter blue
  primaryHover: '#1A91DA',
  primaryPressed: '#1781BF',
  primaryFaded: 'rgba(29, 161, 242, 0.1)',

  // Text colors
  text: '#E7E9EA', // Primary text (off-white)
  textSecondary: '#8899A6', // Secondary text (blue-gray)
  textTertiary: '#536471', // Muted text
  textInverse: '#0F1419', // Text on light backgrounds

  // Border colors - Twitter's subtle borders
  border: '#38444D',
  borderHover: '#536471',

  // Status colors
  success: '#00BA7C', // Twitter green
  error: '#F4212E', // Twitter red
  warning: '#FFAD1F', // Twitter yellow
  info: '#1DA1F2', // Twitter blue

  // Card and surface colors
  card: '#192734',
  cardBorder: '#38444D',
  cardHover: '#1C2833',

  // Accent colors
  accent: '#1DA1F2',
  accentFaded: 'rgba(29, 161, 242, 0.1)',
  accentGlow: 'rgba(29, 161, 242, 0.3)',

  // Shadow and glow effects
  shadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
  shadowLarge: '0 4px 12px rgba(0, 0, 0, 0.15)',
  glow: '0 0 16px rgba(29, 161, 242, 0.4)',
  glowLarge: '0 0 24px rgba(29, 161, 242, 0.5)',

  // Button colors
  buttonPrimary: '#1DA1F2',
  buttonPrimaryHover: '#1A91DA',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: 'transparent',
  buttonSecondaryBorder: '#536471',
  buttonSecondaryText: '#E7E9EA',

  // Special elements
  highlight: 'rgba(29, 161, 242, 0.1)',
  overlay: 'rgba(91, 112, 131, 0.4)',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #1DA1F2 0%, #1781BF 100%)',
  gradientCard: 'linear-gradient(180deg, #192734 0%, #15202B 100%)',
  gradientOverlay: 'linear-gradient(180deg, rgba(21, 32, 43, 0) 0%, rgba(21, 32, 43, 0.9) 100%)',

  // Navigation
  navBackground: 'rgba(21, 32, 43, 0.85)',
  navBackdrop: 'blur(12px)',
  navBorder: 'rgba(56, 68, 77, 0.6)',

  // Status indicators
  online: '#00BA7C',
  offline: '#536471',
  busy: '#F4212E',
  away: '#FFAD1F',

  // Chart colors
  chartPrimary: '#1DA1F2',
  chartSecondary: '#794BC4',
  chartTertiary: '#00BA7C',
  chartQuaternary: '#F4212E',

  // White and transparent
  white: '#FFFFFF',
  transparent: 'transparent'
};

// Export theme variants for different contexts
export const TWITTER_DARK_THEME = {
  ...TWITTER_COLORS,

  // Component-specific colors
  header: {
    background: 'rgba(21, 32, 43, 0.85)',
    backdrop: 'blur(12px)',
    border: 'rgba(56, 68, 77, 0.6)',
    text: '#E7E9EA',
    logo: '#1DA1F2'
  },

  navigation: {
    background: 'rgba(21, 32, 43, 0.85)',
    backdrop: 'blur(12px)',
    border: 'rgba(56, 68, 77, 0.6)',
    icon: '#8899A6',
    iconActive: '#1DA1F2',
    text: '#8899A6',
    textActive: '#1DA1F2',
    actionButton: '#1DA1F2',
    actionButtonGlow: '0 0 16px rgba(29, 161, 242, 0.4)'
  },

  dashboard: {
    background: '#15202B',
    card: '#192734',
    cardBorder: '#38444D',
    text: '#E7E9EA',
    textMuted: '#8899A6',
    accent: '#1DA1F2',
    success: '#00BA7C',
    warning: '#FFAD1F',
    error: '#F4212E'
  },

  form: {
    background: '#192734',
    border: '#38444D',
    borderFocus: '#1DA1F2',
    text: '#E7E9EA',
    placeholder: '#8899A6',
    error: '#F4212E'
  },

  modal: {
    background: '#192734',
    overlay: 'rgba(91, 112, 131, 0.4)',
    border: '#38444D'
  }
};

export default TWITTER_DARK_THEME;
