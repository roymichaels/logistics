/**
 * Twitter/X Dark Theme Color System
 * Authentic Twitter/X dark mode colors (2024-2025)
 * Based on Twitter's actual dark blue-black theme
 */

export const TWITTER_COLORS = {
  // Background colors - Twitter uses dark blue-black, NOT pure black
  background: '#15202B', // Twitter's main dark background (Black Pearl)
  backgroundSecondary: '#192734', // Secondary dark background
  backgroundHover: '#22303C', // Hover states (lighter blue-gray)

  // Primary blue (Twitter blue)
  primary: '#1D9BF0', // Twitter blue (current)
  primaryHover: '#1A8CD8',
  primaryPressed: '#1683BF',
  primaryFaded: 'rgba(29, 155, 240, 0.1)',

  // Text colors
  text: '#E7E9EA', // Primary text (off-white)
  textSecondary: '#8899A6', // Secondary/muted text (blue-gray)
  textTertiary: '#536471', // Even more muted
  textInverse: '#0F1419', // Text on light backgrounds

  // Border colors - Twitter uses subtle blue-gray borders
  border: '#38444D',
  borderHover: '#4A5568',

  // Status colors
  success: '#00BA7C', // Green
  error: '#F4212E', // Red
  warning: '#FFD400', // Yellow
  info: '#1D9BF0', // Blue

  // Card and surface colors
  card: '#192734',
  cardBorder: '#38444D',
  cardHover: '#22303C',

  // Accent colors
  accent: '#1D9BF0', // Same as primary
  accentFaded: 'rgba(29, 155, 240, 0.1)',
  accentGlow: 'rgba(29, 155, 240, 0.3)',

  // Shadow and glow effects
  shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  shadowLarge: '0 4px 12px rgba(0, 0, 0, 0.4)',
  glow: '0 0 15px rgba(29, 155, 240, 0.4)',
  glowLarge: '0 0 30px rgba(29, 155, 240, 0.5)',

  // Button colors
  buttonPrimary: '#1D9BF0',
  buttonPrimaryHover: '#1A8CD8',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: 'transparent',
  buttonSecondaryBorder: '#536471',
  buttonSecondaryText: '#E7E9EA',

  // Special elements
  highlight: 'rgba(29, 155, 240, 0.1)',
  overlay: 'rgba(91, 112, 131, 0.4)',

  // Gradients
  gradientPrimary: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
  gradientCard: 'linear-gradient(180deg, #192734 0%, #15202B 100%)',
  gradientOverlay: 'linear-gradient(180deg, rgba(21, 32, 43, 0) 0%, rgba(21, 32, 43, 0.9) 100%)',

  // Navigation
  navBackground: 'rgba(21, 32, 43, 0.85)',
  navBackdrop: 'blur(12px)',
  navBorder: 'rgba(56, 68, 77, 0.7)',

  // Status indicators
  online: '#00BA7C',
  offline: '#536471',
  busy: '#F4212E',
  away: '#FFD400',

  // Chart colors
  chartPrimary: '#1D9BF0',
  chartSecondary: '#7856FF',
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
    border: 'rgba(56, 68, 77, 0.7)',
    text: TWITTER_COLORS.text,
    logo: TWITTER_COLORS.primary
  },

  navigation: {
    background: 'rgba(21, 32, 43, 0.85)',
    backdrop: 'blur(12px)',
    border: 'rgba(56, 68, 77, 0.7)',
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
    overlay: 'rgba(91, 112, 131, 0.4)',
    border: TWITTER_COLORS.border
  }
};

export default TWITTER_DARK_THEME;
