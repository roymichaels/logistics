/**
 * Token Compatibility Layer
 *
 * Re-exports underground theme tokens under old token names
 * This allows gradual migration from old token systems to underground theme
 *
 * @deprecated Use undergroundTheme directly from styles/undergroundTheme
 */

import { undergroundTheme } from './undergroundTheme';

export const tokens = {
  colors: {
    background: {
      primary: undergroundTheme.colors.background.deepDark,
      secondary: undergroundTheme.colors.background.dark,
      tertiary: undergroundTheme.colors.background.medium,
      surface: undergroundTheme.colors.background.surface,
      cardBg: undergroundTheme.colors.glassmorphism.light,
      cardBorder: undergroundTheme.colors.glassmorphism.border,
      base: undergroundTheme.colors.background.deepDark,
    },
    text: {
      primary: undergroundTheme.colors.text.primary,
      secondary: undergroundTheme.colors.text.secondary,
      tertiary: undergroundTheme.colors.text.tertiary,
      muted: undergroundTheme.colors.text.muted,
    },
    textBright: undergroundTheme.colors.text.primary,
    subtle: undergroundTheme.colors.text.tertiary,
    accent: {
      primary: undergroundTheme.colors.accent.primary,
      secondary: undergroundTheme.colors.accent.secondary,
      blue: undergroundTheme.colors.accent.primary,
    },
    brand: {
      primary: undergroundTheme.colors.accent.primary,
      secondary: undergroundTheme.colors.accent.secondary,
    },
    status: {
      success: undergroundTheme.colors.status.success,
      warning: undergroundTheme.colors.status.warning,
      error: undergroundTheme.colors.status.error,
      info: undergroundTheme.colors.status.info,
    },
    border: {
      primary: undergroundTheme.colors.glassmorphism.border,
      secondary: 'rgba(255, 255, 255, 0.05)',
      default: undergroundTheme.colors.glassmorphism.border,
      strong: undergroundTheme.colors.glassmorphism.borderHover,
      subtle: 'rgba(255, 255, 255, 0.05)',
      hover: undergroundTheme.colors.glassmorphism.borderHover,
    },
  },
  gradients: {
    primary: undergroundTheme.colors.gradient.accent,
    card: undergroundTheme.colors.gradient.card,
    accent: undergroundTheme.colors.gradient.accent,
    glass: 'linear-gradient(145deg, rgba(22, 33, 62, 0.4) 0%, rgba(15, 15, 35, 0.3) 100%)',
    cardHover: 'linear-gradient(145deg, rgba(22, 33, 62, 0.7) 0%, rgba(15, 15, 35, 0.5) 100%)',
    success: undergroundTheme.colors.gradient.success,
    warning: undergroundTheme.colors.gradient.warning,
    error: undergroundTheme.colors.gradient.error,
  },
  spacing: {
    xs: undergroundTheme.spacing.xs,
    sm: undergroundTheme.spacing.sm,
    md: undergroundTheme.spacing.md,
    lg: undergroundTheme.spacing.lg,
    xl: undergroundTheme.spacing.xl,
    '2xl': undergroundTheme.spacing['2xl'],
    '3xl': undergroundTheme.spacing['3xl'],
  },
  borderRadius: {
    sm: undergroundTheme.borderRadius.sm,
    md: undergroundTheme.borderRadius.md,
    lg: undergroundTheme.borderRadius.lg,
    xl: undergroundTheme.borderRadius.xl,
    full: undergroundTheme.borderRadius.full,
  },
  radius: {
    sm: undergroundTheme.borderRadius.sm,
    md: undergroundTheme.borderRadius.md,
    lg: undergroundTheme.borderRadius.lg,
    xl: undergroundTheme.borderRadius.xl,
    full: undergroundTheme.borderRadius.full,
  },
  shadows: {
    sm: undergroundTheme.shadows.sm,
    md: undergroundTheme.shadows.md,
    lg: undergroundTheme.shadows.lg,
    xl: undergroundTheme.shadows.xl,
    glow: undergroundTheme.shadows.glow.cyan,
    mdStrong: undergroundTheme.shadows.lg,
  },
  glows: {
    primary: undergroundTheme.shadows.glow.cyan,
    subtle: undergroundTheme.shadows.glow.cyan,
    success: undergroundTheme.shadows.glow.success,
    warning: undergroundTheme.shadows.glow.warning,
    error: undergroundTheme.shadows.glow.error,
  },
  typography: {
    fontSize: undergroundTheme.typography.fontSize,
    fontWeight: undergroundTheme.typography.fontWeight,
    lineHeight: undergroundTheme.typography.lineHeight,
  },
  transitions: {
    fast: undergroundTheme.transitions.fast,
    normal: undergroundTheme.transitions.normal,
    slow: undergroundTheme.transitions.slow,
  },
};

export const modernTokens = tokens;
export const TELEGRAM_THEME = {
  bg: undergroundTheme.colors.background.deepDark,
  secondaryBg: undergroundTheme.colors.background.dark,
  text: undergroundTheme.colors.text.primary,
  hint: undergroundTheme.colors.text.tertiary,
  link: undergroundTheme.colors.accent.primary,
  button: undergroundTheme.colors.accent.primary,
  buttonText: undergroundTheme.colors.text.primary,
  headerBg: undergroundTheme.colors.background.surface,
  sectionBg: undergroundTheme.colors.background.medium,
  destructive: undergroundTheme.colors.status.error,
};

export const TWITTER_COLORS = {
  background: undergroundTheme.colors.background.deepDark,
  foreground: undergroundTheme.colors.text.primary,
  primary: undergroundTheme.colors.accent.primary,
  secondary: undergroundTheme.colors.text.secondary,
  border: undergroundTheme.colors.glassmorphism.border,
  hover: undergroundTheme.colors.background.surface,
};

export const twitterTheme = TWITTER_COLORS;
export const telegramTheme = TELEGRAM_THEME;

export const styles = {
  // Page structure
  pageContainer: {
    minHeight: '100vh',
    background: undergroundTheme.colors.background.deepDark,
    padding: undergroundTheme.spacing['2xl'],
    paddingBottom: '100px',
  },
  pageHeader: {
    marginBottom: undergroundTheme.spacing['3xl'],
    textAlign: 'center' as const,
  },
  pageTitle: {
    margin: 0,
    fontSize: undergroundTheme.typography.fontSize['4xl'],
    fontWeight: undergroundTheme.typography.fontWeight.bold,
    color: undergroundTheme.colors.text.primary,
    marginBottom: undergroundTheme.spacing.sm,
  },
  pageSubtitle: {
    margin: 0,
    fontSize: undergroundTheme.typography.fontSize.base,
    color: undergroundTheme.colors.text.tertiary,
    fontWeight: undergroundTheme.typography.fontWeight.medium,
  },
  // Card styles
  card: {
    background: undergroundTheme.colors.glassmorphism.light,
    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    borderRadius: undergroundTheme.borderRadius.xl,
    padding: undergroundTheme.spacing['2xl'],
    marginBottom: undergroundTheme.spacing.lg,
    backdropFilter: 'blur(20px)',
    boxShadow: undergroundTheme.shadows.md,
    transition: undergroundTheme.transitions.normal,
  },
  // Stat card styles
  stat: {
    value: {
      fontSize: undergroundTheme.typography.fontSize['3xl'],
      fontWeight: undergroundTheme.typography.fontWeight.bold,
      color: undergroundTheme.colors.accent.primary,
      marginBottom: undergroundTheme.spacing.xs,
    },
    label: {
      fontSize: undergroundTheme.typography.fontSize.sm,
      color: undergroundTheme.colors.text.tertiary,
      fontWeight: undergroundTheme.typography.fontWeight.medium,
    },
  },
  // Empty state styles
  emptyState: {
    container: {
      textAlign: 'center' as const,
      padding: `${undergroundTheme.spacing['5xl']} ${undergroundTheme.spacing.xl}`,
      color: undergroundTheme.colors.text.tertiary,
    },
    containerIcon: {
      fontSize: '64px',
      marginBottom: undergroundTheme.spacing.lg,
      opacity: 0.5,
    },
    containerText: {
      fontSize: undergroundTheme.typography.fontSize.lg,
      color: undergroundTheme.colors.text.tertiary,
    },
  },
  // Button styles
  button: {
    primary: {
      padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
      background: undergroundTheme.colors.gradient.accent,
      border: 'none',
      borderRadius: undergroundTheme.borderRadius.lg,
      color: undergroundTheme.colors.text.primary,
      fontSize: undergroundTheme.typography.fontSize.base,
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
      cursor: 'pointer',
      boxShadow: undergroundTheme.shadows.glow.cyan,
      transition: undergroundTheme.transitions.normal,
    },
    secondary: {
      padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
      background: undergroundTheme.colors.glassmorphism.light,
      border: `2px solid ${undergroundTheme.colors.accent.primary}`,
      borderRadius: undergroundTheme.borderRadius.lg,
      color: undergroundTheme.colors.accent.primary,
      fontSize: undergroundTheme.typography.fontSize.base,
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: undergroundTheme.transitions.normal,
    },
    danger: {
      padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing['2xl']}`,
      background: undergroundTheme.colors.status.error,
      border: 'none',
      borderRadius: undergroundTheme.borderRadius.lg,
      color: undergroundTheme.colors.text.primary,
      fontSize: undergroundTheme.typography.fontSize.base,
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: undergroundTheme.transitions.normal,
    },
  },
  // Input styles
  input: {
    width: '100%',
    padding: `${undergroundTheme.spacing.md} ${undergroundTheme.spacing.lg}`,
    background: undergroundTheme.colors.background.dark,
    border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
    borderRadius: undergroundTheme.borderRadius.md,
    color: undergroundTheme.colors.text.primary,
    fontSize: undergroundTheme.typography.fontSize.base,
    outline: 'none',
    transition: undergroundTheme.transitions.normal,
  },
};

export default tokens;
