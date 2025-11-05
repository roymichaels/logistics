/**
 * 🐦 TWITTER/X DARK THEME
 *
 * Consistent, elegant Twitter-style blue aesthetic across all pages
 * Authentic Twitter dark mode colors
 */

export const ROYAL_COLORS = {
  // Backgrounds
  background: '#15202B', // Twitter dark background
  backgroundSolid: '#15202B',
  backgroundDark: '#192734',

  // Cards & Surfaces
  card: '#192734',
  cardBg: '#192734',
  cardHover: '#22303C',
  cardBorder: 'rgba(56, 68, 77, 0.5)',
  cardBorderHover: 'rgba(29, 155, 240, 0.5)',
  border: '#38444D',

  // Secondary surfaces
  secondary: '#192734',
  secondaryHover: '#22303C',

  // Text
  text: '#E7E9EA',
  textBright: '#ffffff',
  muted: '#8899A6',
  mutedDark: 'rgba(136, 153, 166, 0.6)',
  hint: 'rgba(136, 153, 166, 0.4)',

  // Accent Colors
  primary: '#1D9BF0',
  accent: '#1D9BF0',
  accentBright: '#1DA1F2',
  accentDark: '#1A8CD8',
  white: '#ffffff',

  // Status Colors
  gold: '#FFD400',
  goldBright: '#FFE44D',
  crimson: '#F4212E',
  crimsonBright: '#F4585E',
  success: '#00BA7C',
  successBright: '#00D68F',
  warning: '#FFD400',
  warningBright: '#FFE44D',
  error: '#F4212E',
  errorBright: '#F4585E',
  info: '#1D9BF0',
  infoBright: '#1DA1F2',

  // Glows & Effects
  glowPurple: '0 0 20px rgba(29, 155, 240, 0.3)',
  glowPurpleStrong: '0 0 30px rgba(29, 155, 240, 0.5)',
  glowGold: '0 0 20px rgba(255, 212, 0, 0.3)',
  glowCrimson: '0 0 20px rgba(244, 33, 46, 0.3)',

  // Shadows
  shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  shadowStrong: '0 4px 12px rgba(0, 0, 0, 0.4)',
  shadowSoft: '0 1px 2px rgba(0, 0, 0, 0.2)',

  // Gradients
  gradientPurple: 'linear-gradient(135deg, #1D9BF0 0%, #1A8CD8 100%)',
  gradientGold: 'linear-gradient(135deg, #FFD400 0%, #FFA500 100%)',
  gradientCrimson: 'linear-gradient(135deg, #F4212E 0%, #C9191E 100%)',
  gradientSuccess: 'linear-gradient(135deg, #00BA7C 0%, #00A368 100%)',
  gradientCard: 'linear-gradient(145deg, #192734 0%, #15202B 100%)',
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
    background: 'rgba(29, 155, 240, 0.2)',
    border: '1px solid rgba(29, 155, 240, 0.5)',
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
