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
    },
    text: {
      primary: undergroundTheme.colors.text.primary,
      secondary: undergroundTheme.colors.text.secondary,
      tertiary: undergroundTheme.colors.text.tertiary,
    },
    accent: {
      primary: undergroundTheme.colors.accent.primary,
      secondary: undergroundTheme.colors.accent.secondary,
      blue: undergroundTheme.colors.accent.primary,
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
    },
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
  shadows: {
    sm: undergroundTheme.shadows.sm,
    md: undergroundTheme.shadows.md,
    lg: undergroundTheme.shadows.lg,
    xl: undergroundTheme.shadows.xl,
    glow: undergroundTheme.shadows.glow.cyan,
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
  card: {
    base: {
      background: undergroundTheme.colors.glassmorphism.light,
      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
      borderRadius: undergroundTheme.borderRadius.lg,
      padding: undergroundTheme.spacing.lg,
      backdropFilter: 'blur(20px)',
    },
  },
  button: {
    primary: {
      background: undergroundTheme.colors.accent.primary,
      color: undergroundTheme.colors.text.primary,
      padding: `${undergroundTheme.spacing.sm} ${undergroundTheme.spacing.md}`,
      borderRadius: undergroundTheme.borderRadius.md,
      border: 'none',
      fontWeight: undergroundTheme.typography.fontWeight.semibold,
    },
  },
  input: {
    base: {
      background: undergroundTheme.colors.background.dark,
      border: `1px solid ${undergroundTheme.colors.glassmorphism.border}`,
      borderRadius: undergroundTheme.borderRadius.md,
      padding: undergroundTheme.spacing.md,
      color: undergroundTheme.colors.text.primary,
    },
  },
};

export default tokens;
