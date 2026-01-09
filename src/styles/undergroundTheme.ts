/**
 * UndergroundStyle Design System
 * Deep dark cyberpunk aesthetic with glassmorphism and cyan accents
 * Inspired by the EnhancedBusinessPreview analytics page
 */

export const undergroundColors = {
  background: {
    deepDark: '#0a0a0f',
    dark: '#0f0f23',
    medium: '#1a1a2e',
    surface: '#16213e',
    elevated: '#1f2937',
  },

  text: {
    primary: '#ffffff',
    secondary: '#e0e0e0',
    tertiary: '#a0a0a0',
    muted: '#6b7280',
    accent: '#00d9ff',
  },

  accent: {
    primary: '#00d9ff',
    secondary: '#22d3ee',
    tertiary: '#06b6d4',
    glow: 'rgba(0, 217, 255, 0.5)',
    subtle: 'rgba(0, 217, 255, 0.1)',
  },

  status: {
    success: '#10b981',
    successGlow: 'rgba(16, 185, 129, 0.5)',
    warning: '#f59e0b',
    warningGlow: 'rgba(245, 158, 11, 0.5)',
    error: '#ef4444',
    errorGlow: 'rgba(239, 68, 68, 0.5)',
    info: '#3b82f6',
    infoGlow: 'rgba(59, 130, 246, 0.5)',
  },

  glassmorphism: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(0, 217, 255, 0.3)',
  },

  gradient: {
    primary: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    card: 'linear-gradient(145deg, rgba(22, 33, 62, 0.6) 0%, rgba(15, 15, 35, 0.4) 100%)',
    accent: 'linear-gradient(135deg, #00d9ff 0%, #22d3ee 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
};

export const undergroundSpacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
  '6xl': '64px',
  '7xl': '80px',
  '8xl': '96px',
};

export const undergroundTypography = {
  fontFamily: {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", Monaco, "Courier New", Courier, monospace',
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
  },

  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  lineHeight: {
    tight: '1.2',
    normal: '1.5',
    relaxed: '1.75',
    loose: '2',
  },
};

export const undergroundBorderRadius = {
  none: '0',
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
};

export const undergroundShadows = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.6)',

  glow: {
    cyan: '0 0 20px rgba(0, 217, 255, 0.5), 0 0 40px rgba(0, 217, 255, 0.2)',
    cyanLarge: '0 0 30px rgba(0, 217, 255, 0.6), 0 0 60px rgba(0, 217, 255, 0.3)',
    success: '0 0 20px rgba(16, 185, 129, 0.5)',
    warning: '0 0 20px rgba(245, 158, 11, 0.5)',
    error: '0 0 20px rgba(239, 68, 68, 0.5)',
  },

  inner: 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
};

export const undergroundTransitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: '400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const undergroundEffects = {
  glassmorphism: {
    light: {
      background: undergroundColors.glassmorphism.light,
      backdropFilter: 'blur(10px)',
      border: `1px solid ${undergroundColors.glassmorphism.border}`,
    },
    medium: {
      background: undergroundColors.glassmorphism.medium,
      backdropFilter: 'blur(20px)',
      border: `1px solid ${undergroundColors.glassmorphism.border}`,
    },
    strong: {
      background: undergroundColors.glassmorphism.strong,
      backdropFilter: 'blur(30px)',
      border: `1px solid ${undergroundColors.glassmorphism.border}`,
    },
  },

  hover: {
    lift: 'translateY(-4px)',
    scale: 'scale(1.02)',
    glow: {
      boxShadow: undergroundShadows.glow.cyan,
    },
  },
};

export const undergroundZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  toast: 1070,
};

export const undergroundComponents = {
  page: {
    minHeight: '100vh',
    background: undergroundColors.gradient.primary,
    padding: undergroundSpacing['2xl'],
    paddingBottom: undergroundSpacing['8xl'],
  },

  section: {
    marginBottom: undergroundSpacing['4xl'],
  },

  card: {
    ...undergroundEffects.glassmorphism.medium,
    borderRadius: undergroundBorderRadius.xl,
    padding: undergroundSpacing['2xl'],
    boxShadow: undergroundShadows.md,
    transition: undergroundTransitions.normal,
  },

  cardHover: {
    transform: undergroundEffects.hover.lift,
    borderColor: undergroundColors.glassmorphism.borderHover,
    boxShadow: undergroundShadows.lg,
  },

  button: {
    primary: {
      background: undergroundColors.gradient.accent,
      color: undergroundColors.text.primary,
      padding: `${undergroundSpacing.md} ${undergroundSpacing['2xl']}`,
      borderRadius: undergroundBorderRadius.lg,
      border: 'none',
      fontSize: undergroundTypography.fontSize.base,
      fontWeight: undergroundTypography.fontWeight.semibold,
      cursor: 'pointer',
      boxShadow: undergroundShadows.glow.cyan,
      transition: undergroundTransitions.normal,
    },
    secondary: {
      background: undergroundColors.glassmorphism.light,
      color: undergroundColors.accent.primary,
      padding: `${undergroundSpacing.md} ${undergroundSpacing['2xl']}`,
      borderRadius: undergroundBorderRadius.lg,
      border: `2px solid ${undergroundColors.accent.primary}`,
      fontSize: undergroundTypography.fontSize.base,
      fontWeight: undergroundTypography.fontWeight.semibold,
      cursor: 'pointer',
      transition: undergroundTransitions.normal,
    },
    ghost: {
      background: 'transparent',
      color: undergroundColors.text.secondary,
      padding: `${undergroundSpacing.md} ${undergroundSpacing.xl}`,
      borderRadius: undergroundBorderRadius.lg,
      border: 'none',
      fontSize: undergroundTypography.fontSize.base,
      fontWeight: undergroundTypography.fontWeight.medium,
      cursor: 'pointer',
      transition: undergroundTransitions.normal,
    },
  },

  input: {
    ...undergroundEffects.glassmorphism.light,
    width: '100%',
    padding: `${undergroundSpacing.md} ${undergroundSpacing.lg}`,
    borderRadius: undergroundBorderRadius.lg,
    color: undergroundColors.text.primary,
    fontSize: undergroundTypography.fontSize.base,
    outline: 'none',
    transition: undergroundTransitions.normal,
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: undergroundSpacing.xs,
    padding: `${undergroundSpacing.xs} ${undergroundSpacing.md}`,
    borderRadius: undergroundBorderRadius.md,
    fontSize: undergroundTypography.fontSize.xs,
    fontWeight: undergroundTypography.fontWeight.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
};

export const undergroundTheme = {
  colors: undergroundColors,
  spacing: undergroundSpacing,
  typography: undergroundTypography,
  borderRadius: undergroundBorderRadius,
  shadows: undergroundShadows,
  transitions: undergroundTransitions,
  effects: undergroundEffects,
  zIndex: undergroundZIndex,
  components: undergroundComponents,
} as const;

export default undergroundTheme;
