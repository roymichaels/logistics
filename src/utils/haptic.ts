/**
 * Haptic feedback utility for providing tactile feedback on user interactions
 * Supports both web (Vibration API) and potentially native platforms
 */

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'soft' | 'success' | 'warning' | 'error';

const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  light: 10,
  soft: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
};

/**
 * Provides haptic feedback to the user
 * Safely handles platforms that don't support vibration
 */
export function haptic(type: HapticFeedbackType = 'light'): void {
  try {
    // Check if vibration API is available
    if (!navigator.vibrate) {
      return; // Silently fail on unsupported platforms
    }

    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently catch any errors to prevent crashes
    console.warn('Haptic feedback failed:', error);
  }
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  } catch (error) {
    console.warn('Cancel haptic failed:', error);
  }
}
