/**
 * UndergroundLab Dark Theme Color System
 * Professional secure business platform design
 * Neutral dark theme with distinctive accent colors
 */

export const TWITTER_COLORS = {
  // Background colors - Neutral dark theme
  background: '#0A0E14', // Deep slate background
  backgroundSecondary: '#131920', // Secondary dark surface
  backgroundHover: '#1C2128', // Hover states

  // Primary accent - Deep cyan/teal (distinctive from Twitter)
  primary: '#00D9FF', // Bright cyan
  primaryHover: '#00C4E6',
  primaryPressed: '#00B0CC',
  primaryFaded: 'rgba(0, 217, 255, 0.1)',

  // Text colors
  text: '#E8EAED', // Primary text (soft white)
  textSecondary: '#9BA1A6', // Secondary text (neutral gray)
  textTertiary: '#6B7280', // Muted text
  textInverse: '#0A0E14', // Text on light backgrounds

  // Border colors - Neutral gray borders
  border: '#2D333B',
  borderHover: '#3D444D',

  // Status colors
  success: '#10B981', // Emerald green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Amber
  info: '#06B6D4', // Cyan

  // Card and surface colors
  card: '#131920',
  cardBorder: '#2D333B',
  cardHover: '#1C2128',

  // Accent colors
  accent: '#00D9FF',
  accentFaded: 'rgba(0, 217, 255, 0.1)',
  accentGlow: 'rgba(0, 217, 255, 0.25)',

  // Shadow and glow effects
  shadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
  shadowLarge: '0 4px 16px rgba(0, 0, 0, 0.5)',
  glow: '0 0 12px rgba(0, 217, 255, 0.3)',
  glowLarge: '0 0 24px rgba(0, 217, 255, 0.4)',

  // Button colors
  buttonPrimary: '#00D9FF',
  buttonPrimaryHover: '#00C4E6',
  buttonPrimaryText: '#0A0E14',
  buttonSecondary: 'transparent',
  buttonSecondaryBorder: '#3D444D',
  buttonSecondaryText: '#E8EAED',

  // Special elements
  highlight: 'rgba(0, 217, 255, 0.12)',
  overlay: 'rgba(10, 14, 20, 0.75)',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #00D9FF 0%, #0891B2 100%)',
  gradientCard: 'linear-gradient(180deg, #131920 0%, #0A0E14 100%)',
  gradientOverlay: 'linear-gradient(180deg, rgba(10, 14, 20, 0) 0%, rgba(10, 14, 20, 0.9) 100%)',

  // Navigation
  navBackground: 'rgba(10, 14, 20, 0.9)',
  navBackdrop: 'blur(16px)',
  navBorder: 'rgba(45, 51, 59, 0.8)',

  // Status indicators
  online: '#10B981',
  offline: '#6B7280',
  busy: '#EF4444',
  away: '#F59E0B',

  // Chart colors
  chartPrimary: '#00D9FF',
  chartSecondary: '#8B5CF6',
  chartTertiary: '#10B981',
  chartQuaternary: '#EF4444',

  // White and transparent
  white: '#FFFFFF',
  transparent: 'transparent'
};

// Export theme variants for different contexts
export const TWITTER_DARK_THEME = {
  ...TWITTER_COLORS,

  // Component-specific colors
  header: {
    background: 'rgba(10, 14, 20, 0.9)',
    backdrop: 'blur(16px)',
    border: 'rgba(45, 51, 59, 0.8)',
    text: TWITTER_COLORS.text,
    logo: TWITTER_COLORS.primary
  },

  navigation: {
    background: 'rgba(10, 14, 20, 0.9)',
    backdrop: 'blur(16px)',
    border: 'rgba(45, 51, 59, 0.8)',
    icon: TWITTER_COLORS.textSecondary,
    iconActive: TWITTER_COLORS.primary,
    text: TWITTER_COLORS.textSecondary,
    textActive: TWITTER_COLORS.primary,
    actionButton: TWITTER_COLORS.primary,
    actionButtonGlow: TWITTER_COLORS.glow
  },

  dashboard: {
    background: TWITTER_COLORS.background,
    card: TWITTER_COLORS.card,
    cardBorder: TWITTER_COLORS.cardBorder,
    text: TWITTER_COLORS.text,
    textMuted: TWITTER_COLORS.textSecondary,
    accent: TWITTER_COLORS.primary,
    success: TWITTER_COLORS.success,
    warning: TWITTER_COLORS.warning,
    error: TWITTER_COLORS.error
  },

  form: {
    background: TWITTER_COLORS.backgroundSecondary,
    border: TWITTER_COLORS.border,
    borderFocus: TWITTER_COLORS.primary,
    text: TWITTER_COLORS.text,
    placeholder: TWITTER_COLORS.textSecondary,
    error: TWITTER_COLORS.error
  },

  modal: {
    background: TWITTER_COLORS.card,
    overlay: 'rgba(10, 14, 20, 0.75)',
    border: TWITTER_COLORS.border
  }
};

export default TWITTER_DARK_THEME;
