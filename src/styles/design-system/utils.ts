import { colors } from './tokens';

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
