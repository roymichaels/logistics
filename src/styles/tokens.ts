/**
 * UNIFIED DESIGN TOKENS
 * Single source of truth for all color, spacing, and style values
 * Replaces ROYAL_COLORS and provides semantic naming
 */

export const tokens = {
  colors: {
    background: {
      primary: '#0f1218',
      secondary: '#161b24',
      tertiary: '#131927',
      card: '#1a2132',
      cardHover: '#1f2740',
    },
    text: {
      primary: '#e6e9ee',
      secondary: '#9aa4b5',
      muted: 'rgba(154, 164, 181, 0.6)',
      hint: 'rgba(154, 164, 181, 0.4)',
      bright: '#ffffff',
    },
    brand: {
      primary: '#1d9bf0',
      primaryHover: '#1a8cd8',
      secondary: '#6c5ce7',
      accent: '#1d9bf0',
    },
    status: {
      success: '#2ecc71',
      successBright: '#00d68f',
      warning: '#f1c40f',
      warningBright: '#ffe44d',
      error: '#e74c3c',
      errorBright: '#f4585e',
      info: '#1d9bf0',
      infoBright: '#1da1f2',
    },
    border: {
      default: 'rgba(255, 255, 255, 0.08)',
      muted: 'rgba(255, 255, 255, 0.05)',
      hover: 'rgba(29, 155, 240, 0.5)',
    },
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 1px 3px rgba(0, 0, 0, 0.3)',
    lg: '0 4px 12px rgba(0, 0, 0, 0.4)',
    xl: '0 12px 32px rgba(0, 0, 0, 0.35)',
  },

  glows: {
    primary: '0 0 20px rgba(29, 155, 240, 0.3)',
    primaryStrong: '0 0 30px rgba(29, 155, 240, 0.5)',
    success: '0 0 20px rgba(46, 204, 113, 0.3)',
    warning: '0 0 20px rgba(241, 196, 15, 0.3)',
    error: '0 0 20px rgba(231, 76, 60, 0.3)',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)',
    secondary: 'linear-gradient(135deg, #6c5ce7 0%, #5b4bc4 100%)',
    success: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    warning: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
    error: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    card: 'linear-gradient(145deg, #1a2132 0%, #131927 100%)',
  },

  radius: {
    xs: '6px',
    sm: '10px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    pill: '9999px',
  },

  spacing: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    xxl: '40px',
  },

  typography: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '24px',
      xxl: '28px',
      xxxl: '32px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
} as const;

export const styles = {
  pageContainer: {
    minHeight: '100vh',
    background: tokens.colors.panel,
    padding: tokens.spacing.lg,
    paddingBottom: '100px',
    direction: 'rtl' as const,
  },

  pageHeader: {
    textAlign: 'center' as const,
    marginBottom: tokens.spacing.xxl,
  },

  pageTitle: {
    margin: 0,
    fontSize: tokens.typography.fontSize.xxl,
    fontWeight: tokens.typography.fontWeight.bold,
    color: tokens.colors.text,
    marginBottom: '8px',
    textShadow: tokens.glows.primary,
  },

  pageSubtitle: {
    margin: 0,
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.subtle,
    fontWeight: tokens.typography.fontWeight.medium,
  },

  card: {
    background: tokens.colors.background.card,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
    boxShadow: tokens.shadows.md,
    transition: 'all 0.3s ease',
  },

  cardHover: {
    background: tokens.colors.background.cardHover,
    border: `1px solid ${tokens.colors.border.hover}`,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xl,
    marginBottom: tokens.spacing.lg,
    boxShadow: tokens.shadows.lg,
    transform: 'translateY(-2px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },

  button: {
    primary: {
      padding: '12px 24px',
      background: tokens.gradients.primary,
      border: 'none',
      borderRadius: tokens.radius.md,
      color: tokens.colors.text.bright,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.semibold,
      cursor: 'pointer',
      boxShadow: tokens.glows.primaryStrong,
      transition: 'all 0.3s ease',
    },
    secondary: {
      padding: '12px 24px',
      background: 'transparent',
      border: `2px solid ${tokens.colors.brand.primary}`,
      borderRadius: tokens.radius.md,
      color: tokens.colors.brand.primary,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    success: {
      padding: '12px 24px',
      background: tokens.gradients.success,
      border: 'none',
      borderRadius: tokens.radius.md,
      color: tokens.colors.text.bright,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    warning: {
      padding: '12px 24px',
      background: tokens.gradients.warning,
      border: 'none',
      borderRadius: tokens.radius.md,
      color: '#1a0a00',
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    danger: {
      padding: '12px 24px',
      background: tokens.gradients.error,
      border: 'none',
      borderRadius: tokens.radius.md,
      color: tokens.colors.text.bright,
      fontSize: tokens.typography.fontSize.base,
      fontWeight: tokens.typography.fontWeight.semibold,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
  },

  badge: {
    base: {
      display: 'inline-block',
      padding: '6px 12px',
      borderRadius: tokens.radius.sm,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: tokens.typography.fontWeight.semibold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    success: {
      background: 'rgba(46, 204, 113, 0.2)',
      border: '1px solid rgba(46, 204, 113, 0.5)',
      color: tokens.colors.status.successBright,
    },
    warning: {
      background: 'rgba(241, 196, 15, 0.2)',
      border: '1px solid rgba(241, 196, 15, 0.5)',
      color: tokens.colors.status.warningBright,
    },
    error: {
      background: 'rgba(231, 76, 60, 0.2)',
      border: '1px solid rgba(231, 76, 60, 0.5)',
      color: tokens.colors.status.errorBright,
    },
    info: {
      background: 'rgba(29, 155, 240, 0.2)',
      border: '1px solid rgba(29, 155, 240, 0.5)',
      color: tokens.colors.status.infoBright,
    },
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    background: tokens.colors.bg,
    border: `1px solid ${tokens.colors.border.default}`,
    borderRadius: tokens.radius.md,
    color: tokens.colors.text,
    fontSize: tokens.typography.fontSize.base,
    outline: 'none',
    transition: 'all 0.3s ease',
  },

  stat: {
    box: {
      background: tokens.colors.bg,
      border: `1px solid ${tokens.colors.border.default}`,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.lg,
      textAlign: 'center' as const,
    },
    value: {
      fontSize: tokens.typography.fontSize.xxxl,
      fontWeight: tokens.typography.fontWeight.bold,
      color: tokens.colors.brand.primary,
      marginBottom: '8px',
      textShadow: tokens.glows.primary,
    },
    label: {
      fontSize: tokens.typography.fontSize.sm,
      color: tokens.colors.subtle,
      fontWeight: tokens.typography.fontWeight.medium,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
  },

  emptyState: {
    container: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: tokens.colors.subtle,
    },
    icon: {
      fontSize: '64px',
      marginBottom: '16px',
      opacity: 0.5,
    },
    text: {
      fontSize: tokens.typography.fontSize.base,
      lineHeight: '1.6',
    },
  },
} as const;

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    pending: tokens.colors.status.warning,
    active: tokens.colors.status.info,
    completed: tokens.colors.status.success,
    cancelled: tokens.colors.status.error,
    success: tokens.colors.status.success,
    warning: tokens.colors.status.warning,
    error: tokens.colors.status.error,
    info: tokens.colors.status.info,
  };

  return statusMap[status.toLowerCase()] || tokens.colors.subtle;
}

export function getStatusBadgeStyle(status: string) {
  const statusLower = status.toLowerCase();

  if (statusLower.includes('success') || statusLower.includes('completed') || statusLower.includes('delivered')) {
    return { ...styles.badge.base, ...styles.badge.success };
  }

  if (statusLower.includes('pending') || statusLower.includes('warning')) {
    return { ...styles.badge.base, ...styles.badge.warning };
  }

  if (statusLower.includes('error') || statusLower.includes('cancelled') || statusLower.includes('failed')) {
    return { ...styles.badge.base, ...styles.badge.error };
  }

  return { ...styles.badge.base, ...styles.badge.info };
}

export function withHover(baseStyle: React.CSSProperties): {
  base: React.CSSProperties;
  hover: React.CSSProperties;
} {
  return {
    base: { ...baseStyle, transition: 'all 0.3s ease' },
    hover: {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadows.lg,
    },
  };
}
