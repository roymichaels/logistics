/**
 * 👑 ROY MICHAELS ROYAL COMMAND CENTER THEME
 *
 * Consistent, elegant, dark purple aesthetic across all pages
 * No plain whites, no generic colors - only royal vibes
 */

export const ROYAL_COLORS = {
  // Backgrounds
  background: 'radial-gradient(125% 125% at 50% 0%, rgba(95, 46, 170, 0.55) 0%, rgba(12, 2, 25, 0.95) 45%, #03000a 100%)',
  backgroundSolid: '#03000a',
  backgroundDark: 'rgba(12, 2, 25, 0.95)',

  // Cards & Surfaces
  card: 'rgba(24, 10, 45, 0.75)',
  cardHover: 'rgba(34, 15, 60, 0.85)',
  cardBorder: 'rgba(140, 91, 238, 0.45)',
  cardBorderHover: 'rgba(156, 109, 255, 0.65)',

  // Secondary surfaces
  secondary: 'rgba(35, 15, 65, 0.7)',
  secondaryHover: 'rgba(45, 20, 80, 0.8)',

  // Text
  text: '#f4f1ff',
  textBright: '#ffffff',
  muted: '#bfa9ff',
  mutedDark: 'rgba(191, 169, 255, 0.6)',
  hint: 'rgba(191, 169, 255, 0.4)',

  // Accent Colors
  accent: '#9c6dff',
  accentBright: '#b589ff',
  accentDark: '#7c3aed',

  // Status Colors
  gold: '#f6c945',
  goldBright: '#ffd966',
  crimson: '#ff6b8a',
  crimsonBright: '#ff8aa5',
  success: '#10b981',
  successBright: '#34d399',
  warning: '#f59e0b',
  warningBright: '#fbbf24',
  error: '#ef4444',
  errorBright: '#f87171',
  info: '#3b82f6',
  infoBright: '#60a5fa',

  // Glows & Effects
  glowPurple: '0 0 20px rgba(156, 109, 255, 0.3)',
  glowPurpleStrong: '0 0 30px rgba(156, 109, 255, 0.5)',
  glowGold: '0 0 20px rgba(246, 201, 69, 0.3)',
  glowCrimson: '0 0 20px rgba(255, 107, 138, 0.3)',

  // Shadows
  shadow: '0 20px 40px rgba(20, 4, 54, 0.45)',
  shadowStrong: '0 25px 50px rgba(20, 4, 54, 0.6)',
  shadowSoft: '0 10px 25px rgba(20, 4, 54, 0.3)',

  // Gradients
  gradientPurple: 'linear-gradient(135deg, #9c6dff 0%, #7c3aed 100%)',
  gradientGold: 'linear-gradient(135deg, #f6c945 0%, #d4a12a 100%)',
  gradientCrimson: 'linear-gradient(135deg, #ff6b8a 0%, #e84c6f 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  gradientCard: 'linear-gradient(145deg, rgba(24, 10, 45, 0.75) 0%, rgba(34, 15, 60, 0.65) 100%)',
};

export const ROYAL_STYLES = {
  // Page Container
  pageContainer: {
    minHeight: '100vh',
    background: ROYAL_COLORS.background,
    padding: '20px',
    paddingBottom: '100px', // Space for bottom nav
    direction: 'rtl' as const
  },

  // Page Header
  pageHeader: {
    textAlign: 'center' as const,
    marginBottom: '32px'
  },

  pageTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700' as const,
    color: ROYAL_COLORS.text,
    marginBottom: '8px',
    textShadow: ROYAL_COLORS.glowPurple
  },

  pageSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: ROYAL_COLORS.muted,
    fontWeight: '500' as const
  },

  // Cards
  card: {
    background: ROYAL_COLORS.card,
    border: `1px solid ${ROYAL_COLORS.cardBorder}`,
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: ROYAL_COLORS.shadow,
    transition: 'all 0.3s ease'
  },

  cardHover: {
    background: ROYAL_COLORS.cardHover,
    border: `1px solid ${ROYAL_COLORS.cardBorderHover}`,
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: ROYAL_COLORS.shadowStrong,
    transform: 'translateY(-2px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  cardTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '700' as const,
    color: ROYAL_COLORS.text
  },

  // Buttons
  buttonPrimary: {
    padding: '12px 24px',
    background: ROYAL_COLORS.gradientPurple,
    border: 'none',
    borderRadius: '12px',
    color: ROYAL_COLORS.textBright,
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    boxShadow: ROYAL_COLORS.glowPurpleStrong,
    transition: 'all 0.3s ease'
  },

  buttonSecondary: {
    padding: '12px 24px',
    background: 'transparent',
    border: `2px solid ${ROYAL_COLORS.accent}`,
    borderRadius: '12px',
    color: ROYAL_COLORS.accent,
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  buttonSuccess: {
    padding: '12px 24px',
    background: ROYAL_COLORS.gradientSuccess,
    border: 'none',
    borderRadius: '12px',
    color: ROYAL_COLORS.textBright,
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  buttonWarning: {
    padding: '12px 24px',
    background: ROYAL_COLORS.gradientGold,
    border: 'none',
    borderRadius: '12px',
    color: '#1a0a00',
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  buttonDanger: {
    padding: '12px 24px',
    background: ROYAL_COLORS.gradientCrimson,
    border: 'none',
    borderRadius: '12px',
    color: ROYAL_COLORS.textBright,
    fontSize: '16px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  // Badges & Tags
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },

  badgeSuccess: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.5)',
    color: ROYAL_COLORS.successBright
  },

  badgeWarning: {
    background: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.5)',
    color: ROYAL_COLORS.warningBright
  },

  badgeError: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    color: ROYAL_COLORS.errorBright
  },

  badgeInfo: {
    background: 'rgba(156, 109, 255, 0.2)',
    border: '1px solid rgba(156, 109, 255, 0.5)',
    color: ROYAL_COLORS.accentBright
  },

  // Inputs
  input: {
    width: '100%',
    padding: '12px 16px',
    background: ROYAL_COLORS.secondary,
    border: `1px solid ${ROYAL_COLORS.cardBorder}`,
    borderRadius: '12px',
    color: ROYAL_COLORS.text,
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.3s ease'
  },

  // Stats Display
  statBox: {
    background: ROYAL_COLORS.secondary,
    border: `1px solid ${ROYAL_COLORS.cardBorder}`,
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center' as const
  },

  statValue: {
    fontSize: '32px',
    fontWeight: '700' as const,
    color: ROYAL_COLORS.accent,
    marginBottom: '8px',
    textShadow: ROYAL_COLORS.glowPurple
  },

  statLabel: {
    fontSize: '14px',
    color: ROYAL_COLORS.muted,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px'
  },

  // Empty State
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: ROYAL_COLORS.muted
  },

  emptyStateIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5
  },

  emptyStateText: {
    fontSize: '16px',
    lineHeight: '1.6'
  }
};

// Helper function to create hover effect
export function withHover(baseStyle: React.CSSProperties): {
  base: React.CSSProperties;
  hover: React.CSSProperties;
} {
  return {
    base: { ...baseStyle, transition: 'all 0.3s ease' },
    hover: {
      transform: 'translateY(-2px)',
      boxShadow: ROYAL_COLORS.shadowStrong
    }
  };
}

// Helper function for status colors
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    pending: ROYAL_COLORS.warning,
    active: ROYAL_COLORS.info,
    completed: ROYAL_COLORS.success,
    cancelled: ROYAL_COLORS.error,
    success: ROYAL_COLORS.success,
    warning: ROYAL_COLORS.warning,
    error: ROYAL_COLORS.error,
    info: ROYAL_COLORS.info
  };

  return statusMap[status.toLowerCase()] || ROYAL_COLORS.muted;
}

// Helper function for status badge
export function getStatusBadgeStyle(status: string) {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('success') || statusLower.includes('completed') || statusLower.includes('delivered')) {
    return { ...ROYAL_STYLES.badge, ...ROYAL_STYLES.badgeSuccess };
  }

  if (statusLower.includes('pending') || statusLower.includes('warning')) {
    return { ...ROYAL_STYLES.badge, ...ROYAL_STYLES.badgeWarning };
  }

  if (statusLower.includes('error') || statusLower.includes('cancelled') || statusLower.includes('failed')) {
    return { ...ROYAL_STYLES.badge, ...ROYAL_STYLES.badgeError };
  }

  return { ...ROYAL_STYLES.badge, ...ROYAL_STYLES.badgeInfo };
}
