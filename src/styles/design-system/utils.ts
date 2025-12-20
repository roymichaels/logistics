import { colors, spacing, borderRadius, shadows, typography, transitions } from './tokens';

/**
 * Design System Utilities
 */

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    pending: colors.status.warning,
    active: colors.brand.primary,
    completed: colors.status.success,
    cancelled: colors.status.error,
    success: colors.status.success,
    warning: colors.status.warning,
    error: colors.status.error,
    info: colors.status.info,
    delivered: colors.status.success,
    'in-progress': colors.brand.primary,
    failed: colors.status.error,
  };

  return statusMap[status.toLowerCase()] || colors.text.secondary;
}

export function getStatusBackground(status: string): string {
  const statusMap: Record<string, string> = {
    pending: colors.status.warningFaded,
    active: colors.brand.primaryFaded,
    completed: colors.status.successFaded,
    cancelled: colors.status.errorFaded,
    success: colors.status.successFaded,
    warning: colors.status.warningFaded,
    error: colors.status.errorFaded,
    info: colors.status.infoFaded,
    delivered: colors.status.successFaded,
    'in-progress': colors.brand.primaryFaded,
    failed: colors.status.errorFaded,
  };

  return statusMap[status.toLowerCase()] || colors.ui.card;
}

export function createGradient(color1: string, color2: string, angle = 135): string {
  return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
}

export function createRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Common style patterns for reuse
 */
export const commonStyles = {
  // Page container
  pageContainer: {
    minHeight: '100vh',
    background: colors.background.primary,
    padding: spacing['2xl'],
    paddingBottom: '100px',
    direction: 'rtl' as const,
  },

  // Page header
  pageHeader: {
    textAlign: 'center' as const,
    marginBottom: spacing['3xl'],
  },

  pageTitle: {
    margin: 0,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textShadow: shadows.glow,
    letterSpacing: typography.letterSpacing.tight,
    lineHeight: typography.lineHeight.tight,
  },

  pageSubtitle: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
  },

  // Empty state
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: colors.text.secondary,
  },

  emptyStateIcon: {
    fontSize: '64px',
    marginBottom: spacing.lg,
    opacity: 0.5,
  },

  emptyStateText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.relaxed,
  },
} as const;

/**
 * Responsive utilities
 */
export const responsive = {
  // Media query helpers
  mobile: '@media (max-width: 767px)',
  tablet: '@media (min-width: 768px) and (max-width: 1023px)',
  desktop: '@media (min-width: 1024px)',
  wide: '@media (min-width: 1280px)',

  // Touch target minimum size (44x44px for accessibility)
  touchTarget: {
    minWidth: '44px',
    minHeight: '44px',
  },

  // Mobile-first spacing (30% smaller on mobile)
  getMobilePadding: (desktopPadding: keyof typeof spacing): string => {
    const paddingValue = parseInt(spacing[desktopPadding]);
    return `${Math.max(4, Math.round(paddingValue * 0.7))}px`;
  },

  // Responsive font size helper
  getFontSize: (mobile: string, desktop: string) => ({
    fontSize: mobile,
    '@media (min-width: 768px)': {
      fontSize: desktop,
    },
  }),

  // Hide on mobile
  hideOnMobile: {
    '@media (max-width: 767px)': {
      display: 'none',
    },
  },

  // Hide on desktop
  hideOnDesktop: {
    '@media (min-width: 768px)': {
      display: 'none',
    },
  },

  // Responsive columns
  columns: {
    one: {
      gridTemplateColumns: '1fr',
    },
    two: {
      gridTemplateColumns: '1fr',
      '@media (min-width: 768px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
    },
    three: {
      gridTemplateColumns: '1fr',
      '@media (min-width: 768px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      '@media (min-width: 1024px)': {
        gridTemplateColumns: 'repeat(3, 1fr)',
      },
    },
    four: {
      gridTemplateColumns: '1fr',
      '@media (min-width: 768px)': {
        gridTemplateColumns: 'repeat(2, 1fr)',
      },
      '@media (min-width: 1024px)': {
        gridTemplateColumns: 'repeat(4, 1fr)',
      },
    },
  },
};
