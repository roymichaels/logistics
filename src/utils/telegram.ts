/**
 * Telegram WebApp API utility
 * Provides safe wrappers for Telegram WebApp features with graceful degradation
 */

import { haptic } from './haptic';

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: any;
  showBackButton?: () => void;
  hideBackButton?: () => void;
  showAlert?: (message: string, callback?: () => void) => void;
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged?: () => void;
  };
}

/**
 * Get the Telegram WebApp instance if available
 */
function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as any)?.Telegram?.WebApp || null;
}

/**
 * Check if app is running inside Telegram
 */
export function isTelegramEnvironment(): boolean {
  return getTelegramWebApp() !== null;
}

/**
 * Show the back button in Telegram WebApp
 */
export function showBackButton(): void {
  try {
    const tg = getTelegramWebApp();
    if (tg?.showBackButton) {
      tg.showBackButton();
    }
  } catch (error) {
    console.warn('Failed to show Telegram back button:', error);
  }
}

/**
 * Hide the back button in Telegram WebApp
 */
export function hideBackButton(): void {
  try {
    const tg = getTelegramWebApp();
    if (tg?.hideBackButton) {
      tg.hideBackButton();
    }
  } catch (error) {
    console.warn('Failed to hide Telegram back button:', error);
  }
}

/**
 * Show an alert dialog
 */
export function showAlert(message: string, callback?: () => void): void {
  try {
    const tg = getTelegramWebApp();
    if (tg?.showAlert) {
      tg.showAlert(message, callback);
    } else if (typeof window !== 'undefined') {
      window.alert(message);
      if (callback) callback();
    }
  } catch (error) {
    console.warn('Failed to show alert:', error);
  }
}

/**
 * Provide haptic feedback
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'soft' = 'light'): void {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred(type);
    } else {
      // Fall back to web vibration API
      haptic(type);
    }
  } catch (error) {
    console.warn('Failed to provide haptic feedback:', error);
  }
}

/**
 * Notification haptic feedback
 */
export function notificationHaptic(type: 'error' | 'success' | 'warning'): void {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback?.notificationOccurred) {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      // Fall back to web vibration API
      haptic(type);
    }
  } catch (error) {
    console.warn('Failed to provide notification haptic:', error);
  }
}

/**
 * Selection changed haptic feedback
 */
export function selectionChangedHaptic(): void {
  try {
    const tg = getTelegramWebApp();
    if (tg?.HapticFeedback?.selectionChanged) {
      tg.HapticFeedback.selectionChanged();
    } else {
      // Fall back to web vibration API
      haptic('soft');
    }
  } catch (error) {
    console.warn('Failed to provide selection haptic:', error);
  }
}

/**
 * Get Telegram init data if available
 */
export function getTelegramInitData(): string | null {
  try {
    const tg = getTelegramWebApp();
    return tg?.initData || null;
  } catch (error) {
    console.warn('Failed to get Telegram init data:', error);
    return null;
  }
}

/**
 * Get Telegram user data if available
 */
export function getTelegramUser(): any | null {
  try {
    const tg = getTelegramWebApp();
    return tg?.initDataUnsafe?.user || null;
  } catch (error) {
    console.warn('Failed to get Telegram user:', error);
    return null;
  }
}

/**
 * Legacy shim object for backward compatibility
 */
export const telegram = {
  hapticFeedback,
  showAlert,
  showBackButton,
  hideBackButton,
  notificationHaptic,
  selectionChangedHaptic,
  isTelegramEnvironment,
  getTelegramInitData,
  getTelegramUser,
};
